import { Chess, type Square } from 'chess.js';
import { roleToTr } from '../utils/boardFeatureExtractor';

export interface OpponentThreat {
  uci: string;
  san: string;
  from: string;
  to: string;
  captured?: string;
  isCheck: boolean;
  isSevereThreat: boolean;
  score?: number;
  description: string;
  arrow: [string, string, string]; // [from, to, 'red']
}

interface PendingJob {
  reqId: number;
  flippedFen: string;
  baselineOppCp?: number;
  timeoutMs: number;
  resolve: (threat: OpponentThreat | null) => void;
}

export class NullMoveThreatService {
  private worker: Worker | null = null;
  private isReady = false;
  private isSearching = false;
  private stopping = false;

  private requestId = 0;
  private activeJob: PendingJob | null = null;
  private queuedJob: PendingJob | null = null;
  private searchTimeout: number | null = null;

  private latestNullMoveCp = 0;
  private latestNullMoveMate = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;

    const setupWorker = (path: string): boolean => {
      try {
        const worker = new Worker(path);
        worker.onmessage = (event: MessageEvent) => {
          const line = typeof event.data === 'string' ? event.data : '';
          this.handleEngineOutput(line);
        };

        worker.onerror = (err) => {
          console.warn(`NullMove Threat Worker error on ${path}:`, err);
          if (path.includes('.wasm')) {
            this.worker = null;
            this.isReady = false;
            setupWorker('/stockfish/stockfish.js');
          }
        };

        this.worker = worker;
        this.sendCommand('uci');
        this.sendCommand('isready');
        return true;
      } catch (err) {
        console.warn('Failed to start NullMove worker:', err);
        return false;
      }
    };

    const hasWasm = typeof WebAssembly === 'object';
    const initialPath = hasWasm ? '/stockfish/stockfish.wasm.js' : '/stockfish/stockfish.js';
    if (!setupWorker(initialPath) && hasWasm) {
      setupWorker('/stockfish/stockfish.js');
    }
  }

  private sendCommand(cmd: string) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  private clearTimer() {
    if (this.searchTimeout !== null) {
      window.clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  private dispatchNext() {
    if (!this.isReady || this.isSearching || !this.queuedJob) return;

    const job = this.queuedJob;
    this.queuedJob = null;

    if (job.reqId !== this.requestId) {
      job.resolve(null);
      return;
    }

    this.activeJob = job;
    this.isSearching = true;
    this.stopping = false;
    this.latestNullMoveCp = 0;
    this.latestNullMoveMate = false;

    this.clearTimer();
    this.searchTimeout = window.setTimeout(() => {
      if (this.activeJob && this.activeJob.reqId === job.reqId) {
        const expired = this.activeJob;
        this.activeJob = null;
        if (this.isSearching && !this.stopping) {
          this.stopping = true;
          this.sendCommand('stop');
        }
        expired.resolve(null);
      }
    }, job.timeoutMs);

    this.sendCommand(`position fen ${job.flippedFen}`);
    this.sendCommand('go movetime 350');
  }

  private handleEngineOutput(line: string) {
    if (line === 'readyok') {
      this.isReady = true;
      this.dispatchNext();
      return;
    }

    if (
      line.startsWith('info') &&
      line.includes('score') &&
      !line.includes('upperbound') &&
      !line.includes('lowerbound') &&
      this.activeJob &&
      !this.stopping
    ) {
      const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);
      const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
      if (mateMatch) {
        const mateVal = parseInt(mateMatch[1], 10);
        this.latestNullMoveMate = mateVal > 0;
        this.latestNullMoveCp = mateVal > 0 ? 10000 : -10000;
      } else if (cpMatch) {
        this.latestNullMoveMate = false;
        this.latestNullMoveCp = parseInt(cpMatch[1], 10);
      }
      return;
    }

    if (line.startsWith('bestmove')) {
      this.clearTimer();
      const finishedJob = this.activeJob;
      this.activeJob = null;
      this.isSearching = false;
      const wasStopping = this.stopping;
      this.stopping = false;

      if (finishedJob && !wasStopping && finishedJob.reqId === this.requestId) {
        const bestMoveUci = line.split(' ')[1];
        if (!bestMoveUci || bestMoveUci === '(none)') {
          finishedJob.resolve(null);
        } else {
          finishedJob.resolve(this.parseThreatMove(finishedJob, bestMoveUci));
        }
      } else if (finishedJob) {
        finishedJob.resolve(null);
      }

      // Immediately start any queued search waiting for the previous one to stop
      this.dispatchNext();
    }
  }

  private parseThreatMove(job: PendingJob, uci: string): OpponentThreat | null {
    try {
      const c = new Chess(job.flippedFen);
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const moveObj = c.move({ from, to, promotion });
      if (!moveObj) return null;

      const isCheck = c.inCheck();
      const captured = moveObj.captured;
      const pieceName = roleToTr(moveObj.piece);
      const threatGain =
        job.baselineOppCp !== undefined
          ? this.latestNullMoveCp - job.baselineOppCp
          : this.latestNullMoveCp;

      const isSevereThreat =
        isCheck ||
        this.latestNullMoveMate ||
        Boolean(captured) ||
        threatGain >= 110;

      let description = '';
      if (this.latestNullMoveMate) {
        description = `Kritik Tehdit: Rakip ${moveObj.san} ile mat ağı kurmayı hedefliyor!`;
      } else if (captured) {
        const capturedName = roleToTr(captured);
        description = `Rakip ${to} karesindeki ${capturedName} taşınızı (${moveObj.san}) ile almayı tehdit ediyor!`;
      } else if (isCheck) {
        description = `Rakip ${moveObj.san} ile şah çekerek doğrudan hücum inisiyatifi istiyor!`;
      } else if (isSevereThreat) {
        description = `Rakip ${moveObj.san} ile ciddi pozisyonel/taktik üstünlük kurmayı tehdit ediyor.`;
      } else {
        description = `Acil taktik tehdit yok; rakibin olası sıradaki fikri: ${moveObj.san} (${pieceName} ile ${to} karesine gelişim).`;
      }

      return {
        uci,
        san: moveObj.san,
        from,
        to,
        captured: captured || undefined,
        isCheck,
        isSevereThreat,
        score: this.latestNullMoveCp,
        description,
        arrow: [from, to, 'red'],
      };
    } catch {
      return null;
    }
  }

  public async detectThreat(
    currentFen: string,
    normalWhiteCp?: number,
    timeoutMs: number = 3500
  ): Promise<OpponentThreat | null> {
    const curReqId = ++this.requestId;

    // 1. Direct check detection
    try {
      const game = new Chess(currentFen);
      if (game.inCheck()) {
        const turn = game.turn();
        const kingSq = this.findKingSquare(game, turn);
        const oppColor = turn === 'w' ? 'b' : 'w';

        let checkerSquare = '';
        let checkerRole = '';
        for (let r = 0; r < 8; r++) {
          for (let col = 0; col < 8; col++) {
            const sq = `${'abcdefgh'[col]}${8 - r}` as Square;
            const piece = game.get(sq);
            if (piece && piece.color === oppColor) {
              const testMoves = game.moves({ square: sq, verbose: true });
              if (testMoves.some((m) => m.to === kingSq)) {
                checkerSquare = sq;
                checkerRole = roleToTr(piece.type);
                break;
              }
            }
          }
          if (checkerSquare) break;
        }

        const roleText = checkerRole ? ` (${checkerRole})` : '';
        return {
          uci: `${checkerSquare}${kingSq}`,
          san: '+',
          from: checkerSquare || kingSq,
          to: kingSq,
          isCheck: true,
          isSevereThreat: true,
          description: `Şahınız doğrudan ${checkerSquare || 'rakip'}${roleText} tarafından tehdit altında! Şahı kaçmalı, araya taş koymalı veya tehdit eden taşı almalısınız.`,
          arrow: [checkerSquare || kingSq, kingSq, 'red'],
        };
      }
    } catch {
      // ignore
    }

    // 2. Flip turn for Null-Move Analysis
    const parts = currentFen.split(' ');
    if (parts.length < 2) return null;

    const currentTurn = parts[1];
    const oppTurn = currentTurn === 'w' ? 'b' : 'w';
    parts[1] = oppTurn;
    parts[3] = '-';
    parts[4] = '0';
    const flippedFen = parts.join(' ');
    const baselineOppCp =
      normalWhiteCp !== undefined
        ? oppTurn === 'w'
          ? normalWhiteCp
          : -normalWhiteCp
        : undefined;

    try {
      const checkFlipped = new Chess(flippedFen);
      if (checkFlipped.moves().length === 0) return null;
    } catch {
      return null;
    }

    if (!this.worker) return null;

    return new Promise<OpponentThreat | null>((resolve) => {
      if (this.queuedJob) {
        this.queuedJob.resolve(null);
      }
      this.queuedJob = {
        reqId: curReqId,
        flippedFen,
        baselineOppCp,
        timeoutMs,
        resolve,
      };

      if (this.isSearching) {
        if (this.activeJob) {
          this.activeJob.resolve(null);
          this.activeJob = null;
        }
        if (!this.stopping) {
          this.stopping = true;
          this.sendCommand('stop');
        }
      } else {
        this.dispatchNext();
      }
    });
  }

  private findKingSquare(game: Chess, color: 'w' | 'b'): Square {
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) {
          return `${'abcdefgh'[c]}${8 - r}` as Square;
        }
      }
    }
    return color === 'w' ? 'e1' : 'e8';
  }

  public stop() {
    this.requestId++;
    this.clearTimer();
    if (this.queuedJob) {
      this.queuedJob.resolve(null);
      this.queuedJob = null;
    }
    if (this.activeJob) {
      this.activeJob.resolve(null);
      this.activeJob = null;
    }
    if (this.isSearching && !this.stopping) {
      this.stopping = true;
      this.sendCommand('stop');
    }
  }
}

export const nullMoveThreatService = new NullMoveThreatService();
