/**
 * Kişisel Hata Defteri (Personal Blunder Book & Spaced Practice Service)
 * Persists user tactical mistakes and suboptimal opening moves for targeted review.
 */

export interface BlunderRecord {
  id: string;
  fen: string;
  historyMoves: string[];
  playedSan: string;
  bestMoveSan: string;
  openingName: string;
  explanation: string;
  createdAt: number;
  lastPracticedAt?: number;
  solveCount: number;
  failCount: number;
  isMastered: boolean;
}

const STORAGE_KEY = 'satranc_blunder_records';

export const blunderBookService = {
  getAll(): BlunderRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  save(blunder: Omit<BlunderRecord, 'id' | 'createdAt' | 'solveCount' | 'failCount' | 'isMastered'>): BlunderRecord {
    const list = this.getAll();
    // Avoid duplicate entry for the exact same FEN and played move
    const existing = list.find((b) => b.fen === blunder.fen && b.playedSan === blunder.playedSan);
    if (existing) {
      return existing;
    }

    const newRecord: BlunderRecord = {
      ...blunder,
      id: `blunder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      solveCount: 0,
      failCount: 0,
      isMastered: false,
    };

    list.unshift(newRecord);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100))); // Keep up to 100 entries
    } catch (e) {
      console.warn('Failed to persist blunder record:', e);
    }
    return newRecord;
  },

  recordAttempt(id: string, success: boolean): void {
    const list = this.getAll();
    const item = list.find((b) => b.id === id);
    if (!item) return;

    item.lastPracticedAt = Date.now();
    if (success) {
      item.solveCount += 1;
      if (item.solveCount >= 2) {
        item.isMastered = true;
      }
    } else {
      item.failCount += 1;
      item.isMastered = false;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  },

  delete(id: string): void {
    const list = this.getAll().filter((b) => b.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  getCount(): number {
    return this.getAll().length;
  },
};
