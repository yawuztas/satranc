export interface CounterOpeningOption {
  san: string;
  name: string;
  eco: string;
  howItCounters: string; // How this opening stops or neutralizes the opponent's attack
  badge: '⚔️ Karşı Taarruz' | '🧱 Duvar / Kilit' | '⚡ Asimetrik Yarma' | '👑 Simetrik Denge' | '🎯 Taktik Gambit';
  winRateBlack?: number;
  winRateWhite?: number;
  drawRate?: number;
}

export interface CandidateCharacterBadge {
  label: string;
  icon: string;
  colorClass: 'amber' | 'emerald' | 'rose' | 'sky' | 'purple' | 'slate';
  desc: string;
}

export interface HistoricalChampionGame {
  white: string;
  black: string;
  year: number;
  event: string;
  result: '1-0' | '0-1' | '1/2-1/2';
  story: string;
  keyMoveSan?: string;
}

export interface CandidateMasterStats {
  totalGames: number;
  whiteWinRate: number;
  drawRate: number;
  blackWinRate: number;
}

export interface CandidateMove {
  san: string;
  from: string;
  to: string;
  leadsTo: string; // E.g. "İtalyan Açılışı"
  tag?: string; // E.g. "En Popüler", "Agresif", "Sağlam", "Klasik", "Gambit"
  why: string; // Why play this move
  threat?: string; // What it threatens
  futureAttack?: string; // İleride nereye nasıl saldıracak? Gelecek vaadi
  color?: 'green' | 'blue' | 'red' | 'yellow'; // Tahta ok rengi
  targetOpening?: {
    name: string;
    eco: string;
    attackObjective: string;
  };
  counterOpenings?: CounterOpeningOption[]; // Rakibin bu açılışa karşı yapması gereken kesen açılışlar
  isForcedDefense?: boolean; // Hayati tehdit karşısında zorunlu tek kurtuluş hamlesi
  isProphylactic?: boolean; // Rakibin saldırı hattını önceden kesen profilaktik hamle
  characterBadge?: CandidateCharacterBadge; // 🏆 Şampiyonların Tercihi, 🤖 Stockfish, ⚔️ Tal Hücumu vb.
  historicalGame?: HistoricalChampionGame | null; // Garry Kasparov vs Anatoly Karpov vb. efsanevi maç
  masterStats?: CandidateMasterStats; // Lichess FIDE Masters veritabanı oyun sayısı ve galibiyet oranları
  isSurpriseWeapon?: boolean; // Puanlar çok yakınsa açılan 5. Gizli Silah / Sürpriz Hamle
  evalScoreText?: string; // Motor skoru metni (örn: "+0.3" veya "Mat #2")
}

export interface MoveAnalysis {
  san: string;
  side: 'white' | 'black';
  openingName: string;
  eco: string;
  title: string;
  whyThisMove: string; // Neden bu hamle yapıldı?
  whatItProtects: string; // Nereyi koruyor?
  whatItThreatens: string; // Nereyi tehdit ediyor?
  futurePlan: string; // Nereden ne çıkar? İleride ne amaçlanıyor?
  futureAttack?: string; // İleride nereye nasıl saldıracak?
  alternativeBranches?: { san: string; leadsTo: string; why: string }[]; // Rakibin/oyuncunun seçebileceği diğer alternatif dallar
  candidateMoves: CandidateMove[]; // What can this side play next
  coachTip?: string; // Hoca / Stockfish tavsiyesi
}

export type BotStyle = 'aggressive' | 'defensive' | 'classical' | 'master';
export type BotElo = 1000 | 1500 | 1800 | 2000 | 2500;
