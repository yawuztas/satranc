export interface EndgameLessonStep {
  ply: number;
  expectedMove: string; // SAN e.g. "Ke6" or "Ra7"
  explanation: string;
  arrows?: [string, string, string?][];
  highlightSquares?: string[];
  keyConcept: string;
  opponentReply?: {
    san: string;
    explanation: string;
  };
}

export interface EndgameLesson {
  id: string;
  title: string;
  category: 'Piyon Sonları' | 'Kale Sonları' | 'Vezir Sonları' | 'Hafif Taş Sonları' | 'Şah & Piyon Matı';
  difficulty: 'Temel' | 'Orta Seviye' | 'Büyükusta Tekniği';
  startingFen: string;
  playerColor: 'white' | 'black';
  summary: string;
  grandmasterPrinciple: string;
  keyRule: string;
  steps: EndgameLessonStep[];
}
