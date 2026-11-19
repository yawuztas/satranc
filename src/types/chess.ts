export type Color = 'white' | 'black';

export interface MoveExplanation {
  ply: number;
  san: string;
  fen: string;
  title: string;
  explanation: string;
  keyIdeas?: string[];
  arrows?: [string, string, string?][]; // [from, to, color?]
  highlightSquares?: string[];
  turnAdvice?: string; // "Nereden ne çıkar? Gelecek planlar..."
}

export interface Variation {
  id: string;
  name: string;
  eco: string;
  moves: string[]; // SAN moves
  description: string;
  steps: MoveExplanation[];
}

export interface Opening {
  id: string;
  name: string;
  turkishName: string;
  eco: string;
  side: 'white' | 'black'; // 'white' = Beyaz Açılışları, 'black' = Siyah Savunmaları/Açılışları
  category: 'Açık Oyunlar (1.e4 e5)' | 'Yarı Açık Oyunlar (1.e4 c5/e6/c6)' | 'Kapalı Oyunlar (1.d4)' | 'Kanat Açılışları' | 'Hint Savunmaları';
  difficulty: 'Başlangıç' | 'Orta Seviye' | 'İleri Düzey';
  overview: string;
  whitePlans: string[];
  blackPlans: string[];
  variations: Variation[];
}

export interface TrapStep {
  ply: number;
  san: string;
  fen: string;
  comment: string;
  isBlunder?: boolean;
  isPunishment?: boolean;
}

export interface OpeningTrap {
  id: string;
  name: string;
  openingName: string;
  side: 'white' | 'black';
  difficulty: 'Kolay' | 'Orta' | 'Usta Tuzağı';
  story: string;
  setupMoves: string[]; // e.g. ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nd4"]
  blunderMoveSan: string; // The opponent's wrong move e.g. "Nxe5"
  puzzleGoal: string; // "Beyaz tuzağa düştü. Siyahın kazanç hamlesini oyna!"
  solutionMoves: string[]; // Subsequent moves e.g. ["Qg5", "Nxf7", "Qxg2"]
  steps: TrapStep[];
  strategicLesson: string;
}

export interface StrategyConcept {
  id: string;
  title: string;
  category: 'Oyun Ortası Planları' | 'Piyon Yapıları' | 'Alet Koordinasyonu' | 'Taktik Motifler';
  icon: string;
  fen: string;
  summary: string;
  explanation: string;
  rulesOfThumb: string[];
  exampleMoves?: string[];
  proTips: string;
  arrows?: [string, string, string?][];
  highlightSquares?: string[];
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

export interface EngineEvaluation {
  fen?: string;
  score: number; // centipawns or +1000 for mate
  isMate: boolean;
  mateIn?: number;
  depth: number;
  bestMove?: string;
  bestMoveSan?: string;
  pv?: string[];
  multiPV?: MultiPVLine[];
}
