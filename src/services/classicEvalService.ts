export interface ClassicEvalTerms {
  material: number;
  pawns: number;
  mobility: number;
  kingSafety: number;
  threats: number;
  passed: number;
  space: number;
  total: number;
}

export interface EvalDeltaReason {
  label: string;
  delta: number; // positive = improved for mover
  detail: string;
}

const evalCache = new Map<string, ClassicEvalTerms>();

export class ClassicEvalService {
  private worker: Worker | null = null;
  private isReady = false;
  private queue: Array<{
    fen: string;
    resolve: (res: ClassicEvalTerms | null) => void;
  }> = [];
  private activeItem: {
    fen: string;
    lines: string[];
    resolve: (res: ClassicEvalTerms | null) => void;
    timer: number;
  } | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;

    const setupWorker = (path: string): boolean => {
      try {
        const worker = new Worker(path);
        worker.onmessage = (e: MessageEvent) => {
          const line = typeof e.data === 'string' ? e.data : '';
          this.handleOutput(line);
        };
        worker.onerror = () => {
          if (path.includes('.wasm')) {
            this.worker = null;
            setupWorker('/stockfish/stockfish.js');
          }
        };
        this.worker = worker;
        worker.postMessage('uci');
        worker.postMessage('isready');
        return true;
      } catch {
        return false;
      }
    };

    const hasWasm = typeof WebAssembly === 'object';
    const initialPath = hasWasm ? '/stockfish/stockfish.wasm.js' : '/stockfish/stockfish.js';
    if (!setupWorker(initialPath) && hasWasm) {
      setupWorker('/stockfish/stockfish.js');
    }
  }

  private handleOutput(line: string) {
    if (line === 'readyok') {
      this.isReady = true;
      this.processNext();
      return;
    }

    if (!this.activeItem) return;
    this.activeItem.lines.push(line);

    if (line.startsWith('Total evaluation:')) {
      window.clearTimeout(this.activeItem.timer);
      const parsed = this.parseEvalTable(this.activeItem.lines);
      if (parsed) {
        evalCache.set(this.activeItem.fen, parsed);
      }
      const { resolve } = this.activeItem;
      this.activeItem = null;
      resolve(parsed);
      this.processNext();
    }
  }

  private parseEvalTable(lines: string[]): ClassicEvalTerms | null {
    const terms: ClassicEvalTerms = {
      material: 0,
      pawns: 0,
      mobility: 0,
      kingSafety: 0,
      threats: 0,
      passed: 0,
      space: 0,
      total: 0,
    };

    let foundAny = false;
    for (const line of lines) {
      if (line.startsWith('Total evaluation:')) {
        const m = line.match(/Total evaluation:\s*(-?\d+(?:\.\d+)?)/);
        if (m) {
          terms.total = parseFloat(m[1]);
          foundAny = true;
        }
        continue;
      }

      if (!line.includes('|')) continue;
      const parts = line.split('|');
      if (parts.length < 4) continue;

      const name = parts[0].trim().toLowerCase();
      const totalNums = parts[3].trim().match(/-?\d+(?:\.\d+)?/g);
      if (!totalNums || totalNums.length === 0) continue;

      // In opening/middlegame, MG (index 0) is the primary weight; blend slightly with EG if available
      const mg = parseFloat(totalNums[0]);
      const eg = totalNums.length > 1 ? parseFloat(totalNums[1]) : mg;
      const val = Number((mg * 0.75 + eg * 0.25).toFixed(2));

      if (name === 'material') terms.material = val;
      else if (name === 'pawns') terms.pawns = val;
      else if (name === 'mobility') terms.mobility = val;
      else if (name === 'king safety') terms.kingSafety = val;
      else if (name === 'threats') terms.threats = val;
      else if (name === 'passed') terms.passed = val;
      else if (name === 'space') terms.space = val;
    }

    return foundAny ? terms : null;
  }

  private processNext() {
    if (!this.isReady || !this.worker || this.activeItem || this.queue.length === 0) return;

    const next = this.queue.shift()!;
    const cached = evalCache.get(next.fen);
    if (cached) {
      next.resolve(cached);
      this.processNext();
      return;
    }

    const timer = window.setTimeout(() => {
      if (this.activeItem?.fen === next.fen) {
        const { resolve } = this.activeItem;
        this.activeItem = null;
        resolve(null);
        this.processNext();
      }
    }, 1000);

    this.activeItem = {
      fen: next.fen,
      lines: [],
      resolve: next.resolve,
      timer,
    };

    this.worker.postMessage(`position fen ${next.fen}`);
    this.worker.postMessage('eval');
  }

  public getEvalTerms(fen: string): Promise<ClassicEvalTerms | null> {
    const cached = evalCache.get(fen);
    if (cached) return Promise.resolve(cached);
    if (!this.worker) return Promise.resolve(null);

    return new Promise((resolve) => {
      this.queue.push({ fen, resolve });
      this.processNext();
    });
  }

  /**
   * Computes classical Stockfish eval deltas between two positions from mover's perspective.
   */
  public async getEvalDelta(
    beforeFen: string,
    afterFen: string,
    moverColor: 'white' | 'black'
  ): Promise<EvalDeltaReason[]> {
    const [before, after] = await Promise.all([
      this.getEvalTerms(beforeFen),
      this.getEvalTerms(afterFen),
    ]);

    if (!before || !after) return [];

    const sign = moverColor === 'white' ? 1 : -1;
    const checks: Array<{ key: keyof ClassicEvalTerms; label: string; threshold: number; upDetail: string; downDetail: string }> = [
      {
        key: 'mobility',
        label: 'Taş Aktivitesi',
        threshold: 0.14,
        upDetail: 'Taşların hareket alanı ve aktivitesi artıyor',
        downDetail: 'Taşların manevra alanı daralıyor',
      },
      {
        key: 'kingSafety',
        label: 'Şah Güvenliği',
        threshold: 0.14,
        upDetail: 'Şah güvenliği belirgin şekilde güçleniyor',
        downDetail: 'Şah kanadında güvenlik açığı oluşuyor',
      },
      {
        key: 'threats',
        label: 'Taktik Baskı',
        threshold: 0.15,
        upDetail: 'Rakip taşlara yönelik doğrudan baskı artıyor',
        downDetail: 'Pozisyonel baskı azalıyor',
      },
      {
        key: 'space',
        label: 'Alan Üstünlüğü',
        threshold: 0.12,
        upDetail: 'Tahtada alan kontrolü genişliyor',
        downDetail: 'Alan üstünlüğü rakibe geçiyor',
      },
      {
        key: 'pawns',
        label: 'Piyon Yapısı',
        threshold: 0.14,
        upDetail: 'Piyon zinciri ve merkez yapısı sağlamlaşıyor',
        downDetail: 'Piyon yapısında zayıflık bırakılıyor',
      },
      {
        key: 'passed',
        label: 'Geçer Piyon',
        threshold: 0.15,
        upDetail: 'Geçer piyon potansiyeli yaratıyor',
        downDetail: 'Geçer piyon baskısı azalıyor',
      },
    ];

    const reasons: EvalDeltaReason[] = [];
    for (const c of checks) {
      const diff = Number(((after[c.key] - before[c.key]) * sign).toFixed(2));
      if (Math.abs(diff) >= c.threshold) {
        reasons.push({
          label: c.label,
          delta: diff,
          detail: `${diff > 0 ? c.upDetail : c.downDetail} (${diff > 0 ? '+' : ''}${diff.toFixed(2)})`,
        });
      }
    }

    reasons.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return reasons.slice(0, 3);
  }
}

export const classicEvalService = new ClassicEvalService();
