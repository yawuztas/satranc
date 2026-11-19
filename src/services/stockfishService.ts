import type { EngineEvaluation } from '../types/chess';
import { Chess } from 'chess.js';

function uciToSan(fen: string, uci: string): string {
  if (!uci || uci.length < 4) return '';
  try {
    const c = new Chess(fen);
    const m = c.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return m?.san || uci;
  } catch {
    return uci;
  }
}

export interface MultiPVLine {
  rank: number;     // 1, 2, or 3
  move: string;     // UCI format (e.g. 'e2e4')
  score: number;    // centipawns from white's perspective
  isMate: boolean;
  mateIn?: number;
  depth: number;
  pv: string[];     // full principal variation in UCI
}

export class StockfishService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private isEvaluating: boolean = false;
  private currentFen: string = '';
  private onEvalCallback: ((evaluation: EngineEvaluation) => void) | null = null;
  private onBotMoveCallback: ((bestMove: string) => void) | null = null;
  private onMultiPVCallback: ((lines: MultiPVLine[]) => void) | null = null;
  private multiPVLines: MultiPVLine[] = [];
  private rank1Eval: EngineEvaluation | null = null;
  private requestId = 0;
  private callbackFen = '';
  private callbackRequestId = 0;
  // A stop is asynchronous in UCI. Keep the next search queued until the
  // engine acknowledges the barrier, so a late bestmove cannot complete it.
  private searchGeneration = 0;
  private activeSearchGeneration = 0;
  private pendingSearch: { generation: number; fen: string; depth: number; multiPV: number } | null = null;

  public getReadyStatus(): boolean {
    return this.isReady;
  }

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;

    const setupWorker = (workerPath: string): boolean => {
      try {
        const worker = new Worker(workerPath);
        worker.onmessage = (event: MessageEvent) => {
          const line = typeof event.data === 'string' ? event.data : '';
          this.handleEngineOutput(line);
        };

        worker.onerror = (err) => {
          console.warn(`Stockfish Worker error on ${workerPath}:`, err);
          if (workerPath.includes('.wasm')) {
            console.info('Falling back to legacy stockfish.js worker...');
            this.worker = null;
            setupWorker('/stockfish/stockfish.js');
          } else {
            this.worker = null;
            this.requestId++;
            this.onEvalCallback = null;
            this.onBotMoveCallback = null;
            this.onMultiPVCallback = null;
          }
        };

        this.worker = worker;
        this.sendCommand('uci');
        this.sendCommand('setoption name Threads value 2');
        this.sendCommand('setoption name Hash value 16');
        this.sendCommand('setoption name MultiPV value 3');
        this.sendCommand('isready');
        return true;
      } catch (e) {
        console.warn(`Failed to initialize ${workerPath}:`, e);
        return false;
      }
    };

    // Prefer fast WebAssembly Stockfish, fallback to asm.js
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

  private handleEngineOutput(line: string) {
    if (line === 'readyok') {
      this.isReady = true;
      if (this.pendingSearch && this.pendingSearch.generation === this.searchGeneration) {
        const pending = this.pendingSearch;
        this.pendingSearch = null;
        this.activeSearchGeneration = pending.generation;
        this.multiPVLines = [];
        this.rank1Eval = null;
        this.sendCommand(`setoption name MultiPV value ${pending.multiPV}`);
        this.sendCommand(`position fen ${pending.fen}`);
        this.sendCommand(`go depth ${pending.depth}`);
        this.isEvaluating = true;
      }
      return;
    }

    // Parse UCI info lines (ignore aspiration lowerbound/upperbound 1-ply lines)
    if (line.startsWith('info') && line.includes('score')) {
      if (this.activeSearchGeneration !== this.searchGeneration) return;
      if (line.includes('upperbound') || line.includes('lowerbound')) return;
      const depthMatch = line.match(/depth\s+(\d+)/);
      const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
      const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);
      const pvMatch = line.match(/\bpv\s+([a-h1-8qrbn\s]+)/);
      const multipvMatch = line.match(/multipv\s+(\d+)/);

      const depth = depthMatch ? parseInt(depthMatch[1], 10) : 10;
      const isBlackToMove = this.currentFen.split(' ')[1] === 'b';
      const rank = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;

      let score = 0;
      let isMate = false;
      let mateIn: number | undefined;

      if (mateMatch) {
        isMate = true;
        const rawMate = parseInt(mateMatch[1], 10);
        mateIn = isBlackToMove ? -rawMate : rawMate;
        score = mateIn > 0 ? 10000 : -10000;
      } else if (cpMatch) {
        const rawCp = parseInt(cpMatch[1], 10);
        score = isBlackToMove ? -rawCp : rawCp;
      }

      let pv: string[] = [];
      if (pvMatch) {
        pv = pvMatch[1].trim().split(/\s+/);
      }

      if (pv.length > 0) {
        const pvLine: MultiPVLine = {
          rank,
          move: pv[0],
          score,
          isMate,
          mateIn,
          depth,
          pv
        };
        // Store line by rank
        const idx = this.multiPVLines.findIndex(l => l.rank === rank);
        if (idx !== -1) {
          this.multiPVLines[idx] = pvLine;
        } else {
          this.multiPVLines.push(pvLine);
        }
      }

      // CRITICAL: Only Rank 1 represents the true engine best move and primary score.
      // Rank 2 and 3 are alternative lines and MUST NOT overwrite bestMove or score!
      if (rank === 1) {
        let bestMove = '';
        if (pv.length > 0 && depth >= 6) {
          bestMove = pv[0];
        }

        const bestMoveSan = bestMove ? uciToSan(this.currentFen, bestMove) : undefined;

        this.rank1Eval = {
          fen: this.currentFen,
          score,
          isMate,
          mateIn,
          depth,
          bestMove: bestMove || undefined,
          bestMoveSan: bestMoveSan || undefined,
          pv,
          multiPV: [...this.multiPVLines].sort((a, b) => a.rank - b.rank),
        };

        if (this.onEvalCallback && this.callbackRequestId === this.requestId && this.callbackFen === this.currentFen) {
          this.onEvalCallback({ ...this.rank1Eval });
        }
      } else {
        // Rank > 1: update multiPV in rank1Eval and notify listeners if rank1Eval exists
        if (this.rank1Eval) {
          this.rank1Eval.multiPV = [...this.multiPVLines].sort((a, b) => a.rank - b.rank);
          if (this.onEvalCallback && this.callbackRequestId === this.requestId && this.callbackFen === this.currentFen) {
            this.onEvalCallback({ ...this.rank1Eval });
          }
        }
      }
    }

    if (line.startsWith('bestmove')) {
      if (this.activeSearchGeneration !== this.searchGeneration) return;
      this.isEvaluating = false;
      this.activeSearchGeneration = 0;
      const parts = line.split(' ');
      const move = parts[1];

      // Sort multiPV by rank
      this.multiPVLines.sort((a, b) => a.rank - b.rank);

      if (move && move !== '(none)') {
        const moveSan = uciToSan(this.currentFen, move);
        if (this.rank1Eval) {
          this.rank1Eval.bestMove = move;
          this.rank1Eval.bestMoveSan = moveSan || undefined;
          this.rank1Eval.multiPV = [...this.multiPVLines];
        } else {
          this.rank1Eval = {
            fen: this.currentFen,
            score: 0,
            isMate: false,
            depth: 10,
            bestMove: move,
            bestMoveSan: moveSan || undefined,
            multiPV: [...this.multiPVLines],
          };
        }

        if (this.onEvalCallback && this.callbackRequestId === this.requestId && this.callbackFen === this.currentFen) {
          this.onEvalCallback({ ...this.rank1Eval });
        }
      }

      if (this.onMultiPVCallback && this.callbackRequestId === this.requestId && this.callbackFen === this.currentFen && this.multiPVLines.length > 0) {
        this.onMultiPVCallback([...this.multiPVLines]);
      }

      if (this.onBotMoveCallback && this.callbackRequestId === this.requestId && this.callbackFen === this.currentFen && move && move !== '(none)') {
        const cb = this.onBotMoveCallback;
        this.onBotMoveCallback = null;
        cb(move);
      }
    }
  }

  public evaluatePosition(fen: string, depth: number = 12, onEval?: (evaluation: EngineEvaluation) => void) {
    const requestId = ++this.requestId;
    this.currentFen = fen;
    this.callbackFen = fen;
    this.callbackRequestId = requestId;
    this.multiPVLines = [];
    this.rank1Eval = null;
    this.onEvalCallback = onEval ?? null;
    this.onBotMoveCallback = null;
    this.onMultiPVCallback = null;

    if (!this.worker) {
      const simpleScore = this.simpleHeuristic(fen);
      if (this.onEvalCallback && requestId === this.requestId && this.currentFen === fen) {
        this.onEvalCallback({
          score: simpleScore,
          isMate: false,
          depth: 1,
        });
      }
      return;
    }

    this.queueSearch(fen, depth, 1);
    return () => this.cancelRequest(requestId);
  }

  public evaluatePositionMultiPV(
    fen: string, 
    depth: number = 12, 
    onEval?: (evaluation: EngineEvaluation) => void,
    onMultiPV?: (lines: MultiPVLine[]) => void
  ): void {
    const requestId = ++this.requestId;
    this.currentFen = fen;
    this.callbackFen = fen;
    this.callbackRequestId = requestId;
    this.multiPVLines = [];
    this.onEvalCallback = onEval ?? null;
    this.onMultiPVCallback = onMultiPV ?? null;
    this.onBotMoveCallback = null;

    if (!this.worker) {
      const simpleScore = this.simpleHeuristic(fen);
      if (this.onEvalCallback && requestId === this.requestId && this.currentFen === fen) {
        this.onEvalCallback({
          score: simpleScore,
          isMate: false,
          depth: 1,
        });
      }
      return;
    }

    this.queueSearch(fen, depth, 3);
  }

  public requestBotMove(fen: string, depth: number = 10, callback: (bestMove: string) => void) {
    const requestId = ++this.requestId;
    this.currentFen = fen;
    this.callbackFen = fen;
    this.callbackRequestId = requestId;
    this.onBotMoveCallback = callback;
    this.onEvalCallback = null;
    this.onMultiPVCallback = null;

    if (!this.worker) {
      // Fallback if worker not available
      setTimeout(() => {
        if (requestId === this.requestId && this.currentFen === fen) callback('');
      }, 500);
      return;
    }

    this.queueSearch(fen, depth, 1);
  }

  private queueSearch(fen: string, depth: number, multiPV: number = 1) {
    const generation = ++this.searchGeneration;
    this.activeSearchGeneration = 0;
    this.pendingSearch = { generation, fen, depth, multiPV };
    this.sendCommand('stop');
    this.sendCommand('isready');
  }

  public stop() {
    this.requestId++;
    this.searchGeneration++;
    this.activeSearchGeneration = 0;
    this.pendingSearch = null;
    this.onEvalCallback = null;
    this.onBotMoveCallback = null;
    this.onMultiPVCallback = null;
    this.multiPVLines = [];
    this.rank1Eval = null;
    if (this.isEvaluating) {
      this.sendCommand('stop');
      this.isEvaluating = false;
    }
  }

  /**
   * Cancel only this request. A newer request owned by another consumer is left intact.
   */
  public cancelRequest(requestId: number) {
    if (requestId === this.requestId) {
      this.stop();
    }
  }

  private simpleHeuristic(fen: string): number {
    const pieceValues: Record<string, number> = {
      p: -100, n: -320, b: -330, r: -500, q: -900, k: 0,
      P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0
    };
    const boardPart = fen.split(' ')[0];
    let score = 0;
    for (const char of boardPart) {
      if (pieceValues[char] !== undefined) {
        score += pieceValues[char];
      }
    }
    return score;
  }

  public terminate() {
    this.stop();
    if (this.worker) {
      this.sendCommand('quit');
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const stockfishService = new StockfishService();
