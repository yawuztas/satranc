import { Chess } from 'chess.js';
import type { CandidateMove, MoveAnalysis } from '../types/tree';
import { MAX_CANDIDATE_CHOICES } from '../types/lesson';
import { findOpeningByMoves, getTheoreticalContinuations } from './openingsDatabase';

/**
 * 4-Color Master Arrow & Badge Color Resolver:
 * 🟢 green  : Mainline, Theory, Classic, Most Popular, Best GM move
 * 🔵 blue   : Solid, Positional, Strategic, Granite Defense, King Safety
 * 🔴 red    : Aggressive, Sharp, Attack, Gambit, Direct Tactical Threat
 * 🟡 yellow : Alternative, Surprise, Dynamic, Hypermodern, Side-line
 */
export function getCandidateColor(cand: CandidateMove): 'green' | 'blue' | 'red' | 'yellow' {
  if (cand.color) return cand.color;
  const tag = (cand.tag || '').toLowerCase();
  const leadsTo = (cand.leadsTo || '').toLowerCase();
  const why = (cand.why || '').toLowerCase();

  // Red: Aggressive, Sharp, Gambit, Tactical, Attack, Deadly
  if (
    tag.includes('agresif') ||
    tag.includes('gambit') ||
    tag.includes('taktik') ||
    tag.includes('ölümcül') ||
    tag.includes('keskin') ||
    tag.includes('saldırı') ||
    tag.includes('atak') ||
    tag.includes('vahşi') ||
    leadsTo.includes('gambit') ||
    leadsTo.includes('fried liver') ||
    leadsTo.includes('kızarmış') ||
    leadsTo.includes('yugoslav') ||
    why.includes('feda') ||
    why.includes('saldırır')
  ) {
    return 'red';
  }

  // Blue: Solid, Defensive, Positional, Strategic, King safety, Calm
  if (
    tag.includes('sağlam') ||
    tag.includes('defansif') ||
    tag.includes('granit') ||
    tag.includes('konumsal') ||
    tag.includes('stratejik') ||
    tag.includes('pasif') ||
    tag.includes('şah güvenliği') ||
    tag.includes('rok') ||
    tag.includes('güvenlik') ||
    tag.includes('sakin') ||
    tag.includes('piramit')
  ) {
    return 'blue';
  }

  // Yellow: Alternative, Hypermodern, Surprise, Dynamic, Flexible, Side-line
  if (
    tag.includes('alternatif') ||
    tag.includes('sürpriz') ||
    tag.includes('hipermodern') ||
    tag.includes('dinamik') ||
    tag.includes('esnek') ||
    tag.includes('özel') ||
    tag.includes('farklı') ||
    tag.includes('yan hat') ||
    tag.includes('hint')
  ) {
    return 'yellow';
  }

  // Green: Mainline, Theory, Classic, Most Popular, Best Master Move (Default)
  return 'green';
}

interface NodeData {
  openingName: string;
  eco: string;
  title: string;
  whyThisMove: string;
  whatItProtects: string;
  whatItThreatens: string;
  futurePlan: string;
  coachTip?: string;
  candidates: CandidateMove[];
}

export const TREE_NODES: Record<string, NodeData> = {
  // ----------------------------------------
  // BAŞLANGIÇ POZİSYONU (STARTING POSITION)
  // ----------------------------------------
  '': {
    openingName: 'Başlangıç Konumu',
    eco: 'A00',
    title: 'Tahta Hazır - Beyazın İlk Hamlesi',
    whyThisMove: 'Oyun henüz başlamadı. Satrançta ilk hamleyi yapan taraf (Beyaz) oyunu başlatır ve inisiyatifi belirler.',
    whatItProtects: 'Tüm taşlar başlangıç karelerinde güvende.',
    whatItThreatens: 'Henüz doğrudan tehdit yok.',
    futurePlan: 'Merkezi (e4, d4, e5, d5) piyonlarla kontrol edin, hafif taşları (at ve fil) hızla geliştirin ve şahınızı erken rok atarak güvene alın.',
    coachTip: '1.e4 veya 1.d4 oynamak satrançta en çok tercih edilen iki büyükusta hamlesidir. Açık ve taktik bir oyun için 1.e4, stratejik ve konumsal bir oyun için 1.d4 önerilir.',
    candidates: [
      { san: 'e4', from: 'e2', to: 'e4', leadsTo: 'İtalyan, İspanyol, Sicilya, Fransız, Caro-Kann', tag: 'En Popüler', why: 'd5 ve f5 karelerini kontrol eder, vezir ve filin çaprazlarını açar.', threat: 'Merkez hakimiyeti kurmak' },
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Vezir Gambiti, Londra Sistemi, Şah-Hint, Slav', tag: 'Sağlam', why: 'e5 ve c5 karelerini kontrol eder, vezir tarafından korunan sağlam bir merkezdir.', threat: 'Rakibin e5 sürüşünü engellemek' },
      { san: 'c4', from: 'c2', to: 'c4', leadsTo: 'İngiliz Açılışı (Ters Sicilya, Simetrik)', tag: 'Popüler', why: 'd5 karesini kanat piyonu ile kontrol eder, hipermodern strateji.', threat: 'Merkeze kanattan baskı' },
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Réti Açılışı / Kral-Hint Saldırısı (KIA)', tag: 'Esnek', why: 'Atı doğal karesine çıkarak siyahın 1... e5 sürüşünü yasaklar.', threat: 'e5 karesini kontrol altına almak' },
      { san: 'f4', from: 'f2', to: 'f4', leadsTo: 'Bird Açılışı', tag: 'Agresif', why: 'e5 karesini kanattan kontrol eder ve şah kanadı hücumu hedefler.', threat: 'e5 karesi ablukası' }
    ]
  },

  // ----------------------------------------
  // 1. e4 DALLARI
  // ----------------------------------------
  'e4': {
    openingName: 'Şah Piyonu Açılışı',
    eco: 'B00 / C00',
    title: '1. e4 - Merkez Kontrolü ve Açık Yollar',
    whyThisMove: 'Beyaz d5 ve f5 karelerini kontrol altına aldı; açık renkli filin ve vezirin önü açıldı.',
    whatItProtects: 'd5 ve f5 karelerine bekçilik eder.',
    whatItThreatens: 'Bir sonraki hamlede d4 sürerek devasa bir piyon merkezi kurmayı amaçlar.',
    futurePlan: 'Siyahın vereceği cevaba göre hafif taşları (Nf3 veya Nc3) geliştirip merkezi sağlama almak.',
    coachTip: 'Siyah simetrik 1... e5 oynarsa İtalyan veya İspanyol a gidebilirsin. 1... c5 oynarsa Sicilya, 1... e6 oynarsa Fransız, 1... c6 oynarsa Caro-Kann a yöneleceksin.',
    candidates: [
      { san: 'e5', from: 'e7', to: 'e5', leadsTo: 'Açık Oyunlar (İtalyan, İspanyol, İskoç, Şah Gambiti)', tag: 'Klasik', why: 'Simetrik merkez piyonu ile beyazın d4 sürüşünü engeller.', threat: 'd4 karesi kontrolü' },
      { san: 'c5', from: 'c7', to: 'c5', leadsTo: 'Sicilya Savunması (Najdorf, Dragon)', tag: 'Agresif', why: 'd4 karesini kanattan kontrol eder ve asimetrik kazanma şansı arar.', threat: 'c-hattını açıp vezir kanadından saldırmak' },
      { san: 'e6', from: 'e7', to: 'e6', leadsTo: 'Fransız Savunması (İlerleme, Winawer)', tag: 'Sağlam', why: 'd5 merkez yarmasını piyonla arkadan destekler.', threat: 'Merkeze d5 ile darbe vurmak' },
      { san: 'c6', from: 'c7', to: 'c6', leadsTo: 'Caro-Kann Savunması (Klasik, İlerleme)', tag: 'Granit Savunma', why: 'c8 filini piyon zinciri dışına çıkarabilmek için d5 i c6 ile destekler.', threat: 'd5 kalesi kurmak' },
      { san: 'd5', from: 'd7', to: 'd5', leadsTo: 'İskandinav Savunması', tag: 'Dinamik', why: 'İlk hamleden beyazın e4 piyonunu doğrudan sorgular.', threat: 'e4 piyonunu hemen almak' },
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Alekhine Savunması', tag: 'Taktik', why: 'e4 piyonuna saldırarak beyaz piyonları üzerine çeker.', threat: 'e4 piyonunu tehdit etmek' },
      { san: 'd6', from: 'd7', to: 'd6', leadsTo: 'Pirc Savunması', tag: 'Hipermodern', why: 'e5 karesini tutar ve g6-Bg7 ile kanat fili gelişimi hazırlar.', threat: 'Esnek karşı saldırı' }
    ]
  },

  // ========================================
  // 1.e4 e5 (AÇIK OYUNLAR)
  // ========================================
  'e4 e5': {
    openingName: 'Açık Oyun (Kral Piyonu Karşılığı)',
    eco: 'C20',
    title: '1... e5 - Merkezde Simetrik Denge',
    whyThisMove: 'Siyah beyazın tek başına merkeze hakim olmasına izin vermedi, d4 karesini kontrol etti.',
    whatItProtects: 'd4 ve f4 karelerini tutar.',
    whatItThreatens: 'Beyazın 2.d4 sürmesi halinde exd4 ile piyon takası yapmayı bekler.',
    futurePlan: 'Beyazın at hamlesine (Nf3) karşı atını (Nc6) veya piyonunu korumak.',
    coachTip: 'Beyaz için en güçlü ve popüler hamle 2.Nf3 tür. Siyahın e5 piyonuna tempolu saldırır.',
    candidates: [
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'İtalyan, İspanyol veya İskoç Açılışı', tag: 'Ana Hat', why: 'e5 piyonunu tehdit eder ve şah kanadı gelişimini başlatır.', threat: 'e5 piyonunu almak' },
      { san: 'f4', from: 'f2', to: 'f4', leadsTo: 'Şah Gambiti', tag: 'Gambit', why: 'f-hattını açarak vahşi bir şah kanadı taarruzu başlatır.', threat: 'e5 piyonunu saptırmak' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Viyana Oyunu', tag: 'Popüler', why: 'd5 karesini kontrol eder ve f4 sürüşünü hazırlar.', threat: 'f4 ile merkezi kırmak' },
      { san: 'Bc4', from: 'f1', to: 'c4', leadsTo: 'Fil Açılışı', tag: 'Klasik', why: 'Doğrudan siyahın zayıf f7 karesine nişan alır.', threat: 'f7 karesine baskı' },
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Merkez Oyunu / Danimarka Gambiti', tag: 'Agresif', why: 'Merkezi derhal açar.', threat: 'd-hattını açmak' }
    ]
  },

  // ========================================
  // ŞAH GAMBİTİ (KING'S GAMBIT)
  // ========================================
  'e4 e5 f4': {
    openingName: 'Şah Gambiti (King\'s Gambit)',
    eco: 'C30',
    title: '2. f4 - Vahşi Şah Gambiti Saldırısı!',
    whyThisMove: 'Beyaz f-piyonunu feda ederek siyahın e5 merkez piyonunu saptırmayı, f-hattını açmayı ve d4 sürerek merkezi domine etmeyi amaçlar.',
    whatItProtects: 'e5 piyonuna doğrudan baskı kurar.',
    whatItThreatens: 'e5 piyonunu almak veya feda sonrası f-dikeyinden f7 aşil tendonuna hücum etmek.',
    futurePlan: 'Siyah piyonu alırsa 3.Nf3 ile şah atını geliştirmek; reddederse d3 veya Nf3 ile taş gelişimine devam etmek.',
    coachTip: 'Siyahın önünde 3 büyük seçenek vardır: 1) 2... exf4 ile gambiti kabul etmek (en popüler), 2) 2... d5 Falkbeer ile merkezi derhal patlatmak (karşı saldırı), 3) 2... Bc5 ile reddedip beyazın rok atmasını engellemek.',
    candidates: [
      { san: 'exf4', from: 'e5', to: 'f4', leadsTo: 'Kabul Edilen Şah Gambiti (KGA)', tag: 'Ana Hat', why: 'Gambiti kabul eder, materyal öne geçer ve beyazın saldırısını karşılamaya hazırlanır.', threat: 'Piyon fazlalığı elde etmek', color: 'green' },
      { san: 'd5', from: 'd7', to: 'd5', leadsTo: 'Falkbeer Karşı Gambiti', tag: 'Karşı Saldırı', why: 'Gambiti reddeder ve beyazın merkezini doğrudan d5 ile havaya uçurur.', threat: 'Beyazın zayıf şah hattını cezalandırmak', color: 'red' },
      { san: 'Bc5', from: 'f8', to: 'c5', leadsTo: 'Reddedilen Şah Gambiti (Klasik)', tag: 'Sağlam', why: 'Piyonu almaz, fili mükemmel c5 karesine çıkarak beyazın kısa rok atmasını yasaklar.', threat: 'g1-a7 çaprazını kilitlemek', color: 'blue' },
      { san: 'Nc6', from: 'b8', to: 'c6', leadsTo: 'Şah Gambiti Reddedildi (At Varyantı)', tag: 'Gelişim', why: 'e5 piyonunu tutar ve d4 karesini kontrol eder.', threat: 'Hızlı taş gelişimi', color: 'yellow' },
      { san: 'd6', from: 'd7', to: 'd6', leadsTo: 'Becker Savunması', tag: 'Piramit', why: 'e5 piyonunu sağlam bir piyon zinciriyle destekler.', threat: 'Merkez dayanıklılığı', color: 'blue' }
    ]
  },

  'e4 e5 f4 exf4': {
    openingName: 'Kabul Edilen Şah Gambiti',
    eco: 'C34',
    title: '2... exf4 - Gambit Kabul Edildi!',
    whyThisMove: 'Siyah f4 piyonunu alarak materyal öne geçti. Beyazın şah kanadında f-hattı açıldı.',
    whatItProtects: 'f4 karesindeki piyonu tutar.',
    whatItThreatens: 'Bir sonraki hamlede ...Qh4+ şah çekerek beyaz şahı merkezde zora sokmak.',
    futurePlan: 'Beyaz için 3.Nf3 hamlesi şarttır çünkü ...Qh4+ ölümcül şah tehdidini keser.',
    coachTip: 'Beyaz mutlaka 3.Nf3 oynamalıdır! Eğer 3.Bc4 oynarsa Piskopos Gambiti olur ama siyah Qh4+ ile sert cevap verebilir.',
    candidates: [
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Kral Atı Gambiti (Ana Hat)', tag: 'En Popüler', why: 'Siyahın ...Qh4+ tehdidini tamamen keser ve taş gelişimini başlatır.', threat: 'Qh4+ şahını engellemek', color: 'green' },
      { san: 'Bc4', from: 'f1', to: 'c4', leadsTo: 'Piskopos Gambiti', tag: 'Agresif', why: 'Doğrudan f7 karesine nişan alır, taktik karmaşaya davet eder.', threat: 'f7 karesine baskı', color: 'red' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Viyana-Gambit Karışımı', tag: 'Gelişim', why: 'd5 karesini kontrol eder ve taş gelişimini hızlandırır.', threat: 'Merkez kontrolü', color: 'blue' },
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Steinitz Gambiti', tag: 'Vahşi Merkez', why: 'Merkezi tamamen ele geçirir ama Qh4+ şahına izin verir.', threat: 'Merkez dominasyonu', color: 'yellow' }
    ]
  },

  'e4 e5 f4 d5': {
    openingName: 'Falkbeer Karşı Gambiti',
    eco: 'C31',
    title: '2... d5 - Falkbeer Karşı Saldırısı!',
    whyThisMove: 'Siyah piyonu almayı reddeder ve doğrudan beyazın merkezine darbe indirir. Beyaz şahın zayıflığından faydalanmayı hedefler.',
    whatItProtects: 'Merkez dengesi.',
    whatItThreatens: 'e4 veya f4 piyonunu almak.',
    futurePlan: 'Beyaz genellikle 3.exd5 oynar, siyah 3... e4 ile beyaz atın f3 e çıkmasını engeller.',
    coachTip: 'Beyaz için en doğru hamle 3.exd5 dir.',
    candidates: [
      { san: 'exd5', from: 'e4', to: 'd5', leadsTo: 'Falkbeer Ana Hattı', tag: 'Ana Hat', why: 'd5 piyonunu alır ve merkezde inisiyatif kazanır.', threat: 'Merkez piyonu kazanmak', color: 'green' },
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Falkbeer At Gelişimi', tag: 'Sağlam', why: 'Atı geliştirerek merkeze baskıyı sürdürür.', threat: 'Taş koordinasyonu', color: 'blue' }
    ]
  },

  'e4 e5 f4 Bc5': {
    openingName: 'Reddedilen Şah Gambiti (Klasik)',
    eco: 'C30',
    title: '2... Bc5 - Rok Yasağı!',
    whyThisMove: 'Siyah filini harika bir konuma yerleştirir; a7-g1 çaprazı boyunca beyaz şahın rok atmasını engeller.',
    whatItProtects: 'g1 karesini ve çaprazı tutar.',
    whatItThreatens: 'Beyaz şahın rok hakkını kaybetmesi.',
    futurePlan: 'Siyah ...d6 ve ...Nf6 oynayarak sağlam bir gelişim elde edecek.',
    coachTip: 'Beyaz atını 3.Nf3 ile geliştirmelidir.',
    candidates: [
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Klasik Reddedilen Hat', tag: 'Ana Hat', why: 'Atı doğal karesine çıkar, e5 e baskı yapar.', threat: 'Gelişim', color: 'green' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Viyana Geçişi', tag: 'Sağlam', why: 'd5 karesini tutar.', threat: 'Merkez kontrolü', color: 'blue' }
    ]
  },

  'e4 e5 Nf3': {
    openingName: 'Kral Atı Açılışı',
    eco: 'C40',
    title: '2. Nf3 - e5 Piyonuna Saldırı!',
    whyThisMove: 'Beyaz atını doğal karesine geliştirdi ve siyahın e5 piyonunu doğrudan tehdit etti.',
    whatItProtects: 'd4 karesini kontrol eder.',
    whatItThreatens: 'Siyah savunmazsa bir sonraki hamlede Nxe5 ile bedava piyon kazanmak.',
    futurePlan: 'c4 filini oyuna sokup kısa rok atmak.',
    coachTip: 'Siyah en doğal olarak 2... Nc6 oynayacaktır. Şimdi İtalyan (Bc4), İspanyol (Bb5) veya İskoç (d4) arasında karar verebilirsin.',
    candidates: [
      { san: 'Nc6', from: 'b8', to: 'c6', leadsTo: 'İtalyan, İspanyol, İskoç, Dört At', tag: 'Ana Hat', why: 'e5 piyonunu en aktif şekilde korur ve d4 ü tutar.', threat: 'Merkez dengesi' },
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Petrov Savunması (Rus Oyunu)', tag: 'Sağlam', why: 'e5 i savunmak yerine beyazın e4 piyonuna karşı saldırı yapar.', threat: 'e4 piyonunu almak' },
      { san: 'd6', from: 'd7', to: 'd6', leadsTo: 'Philidor Savunması', tag: 'Pasif', why: 'Piyonu d6 ile korur ancak c8 filinin önünü tıkar.', threat: 'Katı savunma' }
    ]
  },

  'e4 e5 Nf3 Nc6': {
    openingName: 'Açık Oyun Ana Düğüm Noktası',
    eco: 'C44',
    title: '2... Nc6 - Piyon Korundu, Yol Ayrımı!',
    whyThisMove: 'Siyah atıyla e5 piyonunu güvene aldı ve d4 karesini kontrol etti.',
    whatItProtects: 'e5 piyonu ve d4 karesi.',
    whatItThreatens: 'Gelişim eşitliği.',
    futurePlan: 'BEYAZIN EN BÜYÜK KARAR ANI! Bc4 ile İtalyan, Bb5 ile İspanyol, d4 ile İskoç veya Nc3 ile Dört At Açılışı.',
    coachTip: 'Eğer f7 zayıflığına doğrudan yüklenmek istersen 3.Bc4 (İtalyan), derin konumsal üstünlük istersen 3.Bb5 (İspanyol), merkezi patlatmak istersen 3.d4 (İskoç) oyna.',
    candidates: [
      { san: 'Bc4', from: 'f1', to: 'c4', leadsTo: 'İtalyan Açılışı (Giuoco Piano & Fried Liver)', tag: 'En Popüler', why: 'Doğrudan yalnızca şah tarafından korunan f7 karesine nişan alır.', threat: 'f7 aşil tendonuna yüklenmek' },
      { san: 'Bb5', from: 'f1', to: 'b5', leadsTo: 'İspanyol Açılışı (Ruy Lopez)', tag: 'Büyükusta Tercihi', why: 'c6 atına baskı kurarak dolaylı yoldan e5 piyonunu zayıflatır.', threat: 'c6 atını açmaza almak' },
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'İskoç Açılışı (Scotch Game)', tag: 'Agresif', why: 'Merkezi anında patlatır ve açık d-hattı elde eder.', threat: 'd4 takasıyla merkeze hakim olmak' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Dört At Açılışı', tag: 'Sağlam', why: 'Tüm hafif taşları hızlıca geliştirir.', threat: 'Kusursuz taş uyumu' }
    ]
  },

  'e4 e5 Nf3 Nc6 Bc4': {
    openingName: 'İtalyan Açılışı',
    eco: 'C50',
    title: '3. Bc4 - İtalyan Filinin Saldırısı',
    whyThisMove: 'Fil c4 karesine çıkarak f7 karesine nişan aldı ve kısa rok hazırlığını tamamladı.',
    whatItProtects: 'd5 karesine kontrol sağlar.',
    whatItThreatens: 'f7 karesine ileride Ng5 ile çift saldırı yapmak.',
    futurePlan: 'c3 ve d4 ile merkezi ele geçirmek veya kısa rok atmak.',
    coachTip: 'Siyah 3... Bc5 oynarsa Giuoco Piano sakin oyununa, 3... Nf6 oynarsa İki At Savunmasına girersiniz. Nf6 oynarsa 4.Ng5 ile Fried Liver Saldırısını patlatabilirsin!',
    candidates: [
      { san: 'Bc5', from: 'f8', to: 'c5', leadsTo: 'Giuoco Piano (Sakin İtalyan Oyunu)', tag: 'Klasik', why: 'Simetrik fil gelişimi ile d4 karesini kontrol eder.', threat: 'Merkez kontrolü' },
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'İki At Savunması (Fried Liver Zemin)', tag: 'Agresif', why: 'Beyazın e4 piyonunu tehdit eder ancak f7 yi boş bırakır!', threat: 'e4 piyonuna saldırı' },
      { san: 'd6', from: 'd7', to: 'd6', leadsTo: 'Yarı İtalyan Savunması', tag: 'Pasif', why: 'Merkezi sağlamlaştırır.', threat: 'Sağlam savunma' }
    ]
  },

  'e4 e5 Nf3 Nc6 Bc4 Bc5': {
    openingName: 'İtalyan Açılışı: Giuoco Piano',
    eco: 'C53',
    title: '3... Bc5 - Klasik İtalyan Dengesi',
    whyThisMove: 'Siyah filini simetrik geliştirip f2 zayıflığına bakar ve d4 karesini kontrol eder.',
    whatItProtects: 'd4 karesi.',
    whatItThreatens: 'Gelişim.',
    futurePlan: 'Beyaz c3 sürerek d4 merkez yarmasını hazırlar veya d3 ile Giuoco Pianissimo sakin oyununu seçer.',
    coachTip: 'c3 oyna! Bir sonraki hamlede d4 sürerek büyük merkezi kuracaksın.',
    candidates: [
      { san: 'c3', from: 'c2', to: 'c3', leadsTo: 'Klasik Giuoco Piano', tag: 'Ana Hat', why: 'd4 sürerek devasa bir piyon merkezi kurmayı hazırlar.', threat: '4.d4 ile merkezi patlatmak' },
      { san: 'd3', from: 'd2', to: 'd3', leadsTo: 'Giuoco Pianissimo (Sakin Oyun)', tag: 'Sağlam', why: 'e4 piyonunu korur ve sakin konumsal manevralara odaklanır.', threat: 'Sağlam piyon zinciri' },
      { san: 'b4', from: 'b2', to: 'b4', leadsTo: 'Evans Gambiti', tag: 'Vahşi Gambit', why: 'Piyon feda ederek Ba5 e çeker, c3 ve d4 ile merkezi süpürür.', threat: 'Hızlı gelişim' }
    ]
  },

  'e4 e5 Nf3 Nc6 Bc4 Nf6': {
    openingName: 'İtalyan Açılışı: İki At Savunması',
    eco: 'C55',
    title: '3... Nf6 - Karşı Saldırı & Fried Liver Kapısı!',
    whyThisMove: 'Siyah atıyla beyazın e4 piyonuna saldırdı ancak f7 karesinin savunmasını boş bıraktı!',
    whatItProtects: 'e4 karesine baskı.',
    whatItThreatens: 'e4 piyonunu almak.',
    futurePlan: 'BEYAZIN EN MEŞHUR HAMLESİ: 4.Ng5! ile f7 karesine çifte saldırı başlatmak (Kızarmış Ciğer / Fried Liver).',
    coachTip: 'Ng5 oyna! Hem c4 filin hem g5 atın aynı anda f7 karesini hedef alacak. Siyah felaket bir baskı altına girecek!',
    candidates: [
      { san: 'Ng5', from: 'f3', to: 'g5', leadsTo: 'Fried Liver Attack (Kızarmış Ciğer)', tag: 'Ölümcül', why: 'f7 karesine çift saldırı! Şah ve kaleye çatal tehdidi.', threat: 'f7 karesinden vezir/kale çatalı' },
      { san: 'd3', from: 'd2', to: 'd3', leadsTo: 'Sakin İki At Savunması', tag: 'Sağlam', why: 'e4 piyonunu korur.', threat: 'Gelişimi sürdürmek' },
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Modern İskoç Karması', tag: 'Agresif', why: 'Merkezi anında açar.', threat: 'Merkez mücadelesi' }
    ]
  },

  'e4 e5 Nf3 Nc6 Bb5': {
    openingName: 'İspanyol Açılışı (Ruy Lopez)',
    eco: 'C60',
    title: '3. Bb5 - Ruy Lopez Baskısı',
    whyThisMove: 'Fil b5 karesinden c6 atını tehdit eder; böylece e5 piyonunun koruyucusu baskı altına alınır.',
    whatItProtects: 'Beyaz rok atmaya hazır.',
    whatItThreatens: 'Dolaylı olarak e5 piyonunu düşürmek.',
    futurePlan: 'c3 ve d4 ile merkez üstünlüğü kurmak, fili b3 te uzun vadeli hücumda tutmak.',
    coachTip: 'Siyah en sık 3... a6 (Morphy Savunması) oynayarak filinizi sorgular. 4.Ba4 ile geri çekilip baskıyı sürdürün.',
    candidates: [
      { san: 'a6', from: 'a7', to: 'a6', leadsTo: 'Morphy Savunması (Ana Hat)', tag: 'En Popüler', why: 'Beyaz fili sorgular: Alacak mısın yoksa geri mi çekeceksin?', threat: 'Fili kovalamak' },
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Berlin Savunması (Aşılmaz Duvar)', tag: 'Sağlam', why: 'e4 piyonuna doğrudan saldırır.', threat: 'e4 piyonunu almak' }
    ]
  },

  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3': {
    openingName: 'İtalyan Açılışı: Giuoco Piano Hazırlığı',
    eco: 'C53',
    title: '4. c3 - d4 Yarması Hazırlanıyor',
    whyThisMove: 'Beyaz d4 sürüşünü piyonla destekleyerek dev bir merkez kurmayı hedefler.',
    whatItProtects: 'd4 karesi.',
    whatItThreatens: '5.d4 sürerek merkezi patlatmak.',
    futurePlan: 'Siyah 4... Nf6 ile e4 piyonuna saldırır, beyaz 5.d4 ile karşılık verir.',
    coachTip: 'Siyah Nf6 oynarsa 5.d4 sür ve merkezi aç!',
    candidates: [
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Giuoco Piano Ana Hat', tag: 'Ana Hat', why: 'e4 piyonuna saldırır ve gelişimi hızlandırır.', threat: 'e4 piyonunu almak' }
    ]
  },

  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4': {
    openingName: 'İtalyan Açılışı: Klasik Merkez Patlaması',
    eco: 'C54',
    title: '5. d4 - İtalyan Merkez Saldırısı!',
    whyThisMove: 'Beyaz d4 sürerek merkez piyonunu filin üzerine sürer ve çatışmayı başlatır.',
    whatItProtects: 'e5 karesi baskısı.',
    whatItThreatens: 'dxc5 ile fili almak veya d5 ile atı kovalamak.',
    futurePlan: 'Siyah 5... exd4 oynamak zorundadır.',
    coachTip: 'Siyah exd4 aldıktan sonra 6.cxd4 ile devasa piyon merkezini koru.',
    candidates: [
      { san: 'exd4', from: 'e5', to: 'd4', leadsTo: 'Merkez Takası', tag: 'Zorunlu', why: 'Merkez piyonunu alır ve beyazın tehditlerini nötralize eder.', threat: 'Piyon eşitliği' }
    ]
  },

  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5': {
    openingName: 'Fried Liver: Tek Savunma!',
    eco: 'C57',
    title: '4... d5 - f7 Tehdidini Kesme Hamlesi',
    whyThisMove: 'Siyah merkez piyonunu feda ederek c4 filinin f7 karesine olan ölümcül görüş hattını keser.',
    whatItProtects: 'f7 zayıflığı.',
    whatItThreatens: 'c4 filini almak.',
    futurePlan: 'Beyaz 5.exd5 ile piyonu alır.',
    coachTip: '5.exd5 oyna! Siyah atıyla 5... Nxd5 alırsa 6.Nxf7!! ile meşhur Fried Liver fedasını patlat!',
    candidates: [
      { san: 'exd5', from: 'e4', to: 'd5', leadsTo: 'Kızarmış Ciğer Çatallanması', tag: 'Ana Hat', why: 'Merkez piyonunu alarak atı kovalar ve f7 baskısını canlı tutar.', threat: 'Nxf7 fedası hazırlığı' }
    ]
  },

  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4': {
    openingName: 'İspanyol Açılışı: Morphy Savunması',
    eco: 'C70',
    title: '4. Ba4 - Fil Çekildi, Baskı Sürüyor',
    whyThisMove: 'Beyaz filini a4 karesine çekerek c6 atı üzerindeki açmaz baskısını korudu.',
    whatItProtects: 'Fil güvende.',
    whatItThreatens: 'Kısa rok atıp e5 piyonuna yüklenmek.',
    futurePlan: 'Siyah 4... Nf6 ile e4 piyonuna saldırır, beyaz 5.O-O ile rok atar.',
    coachTip: 'Siyah 4... Nf6 oynadığında hemen 5.O-O rok at. e4 piyonu henüz tehlikede değil çünkü Re1 ile koruyacaksın!',
    candidates: [
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'İspanyol Kapalı ve Açık Hatlar', tag: 'Ana Hat', why: 'Gelişimi sürdürür ve e4 piyonuna baskı kurar.', threat: 'e4 piyonunu almak' },
      { san: 'd6', from: 'd7', to: 'd6', leadsTo: 'Modern Steinitz Savunması', tag: 'Sağlam', why: 'e5 piyonunu arkadan destekler.', threat: 'Katı piyon yapısı' }
    ]
  },

  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O': {
    openingName: 'İspanyol Açılışı: Büyükusta Ana Hattı',
    eco: 'C80 / C84',
    title: '5. O-O - Şah Güvende, Kale Oyuna!',
    whyThisMove: 'Beyaz şahını güvenli limana aldı ve kaleyi e-hattına bağladı.',
    whatItProtects: 'Şah kanadı.',
    whatItThreatens: 'Re1 ile e-hattını açıp siyah şaha saldırmak.',
    futurePlan: 'Siyah 5... Be7 ile Kapalı İspanyol a veya 5... Nxe4 ile Açık İspanyol a girer.',
    coachTip: 'Siyah 5... Be7 oynarsa 6.Re1 ile e4 piyonunu tut ve ardından c3-d4 ile merkezi parçala!',
    candidates: [
      { san: 'Be7', from: 'f8', to: 'e7', leadsTo: 'Kapalı İspanyol (Closed Ruy Lopez)', tag: 'En Popüler', why: 'Filini geliştirip rok hazırlığı yapar, sakin ve derin strateji.', threat: 'Kısa rok hazırlığı' },
      { san: 'Nxe4', from: 'f6', to: 'e4', leadsTo: 'Açık İspanyol (Open Ruy Lopez)', tag: 'Agresif', why: 'e4 piyonunu alarak taktik bir savaşa girer.', threat: 'Piyon üstünlüğü' },
      { san: 'b5', from: 'b7', to: 'b5', leadsTo: 'Erken b5 Kanat Genişlemesi', tag: 'Aktif', why: 'Fili b3 e kovalar.', threat: 'Fil kovalamaca' }
    ]
  },

  // ========================================
  // 1.e4 c5 (SİCİLYA SAVUNMASI)
  // ========================================
  'e4 c5': {
    openingName: 'Sicilya Savunması',
    eco: 'B20',
    title: '1... c5 - Asimetrik ve Keskin Karşı Saldırı',
    whyThisMove: 'Siyah d4 karesini kanat piyonu ile kontrol etti; beyazın tek başına merkeze hakim olmasını engelledi.',
    whatItProtects: 'd4 karesini tutar.',
    whatItThreatens: 'İleride c-hattını kaleyle ele geçirip vezir kanadından saldırmak.',
    futurePlan: 'Beyaz için en popüler devam yolu 2.Nf3 ile d4 sürüşünü hazırlamaktır (Açık Sicilya).',
    coachTip: '2.Nf3 oynamak ana hattır. Eğer keskin taktiklerden kaçınmak istersen 2.Nc3 (Kapalı Sicilya) veya 2.c3 (Alapin) tercih edebilirsin.',
    candidates: [
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Açık Sicilya (Najdorf, Dragon)', tag: 'Ana Hat', why: 'd4 sürüşünü hazırlayarak merkezi açar.', threat: '3.d4 ile merkezi parçalamak' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Kapalı Sicilya', tag: 'Stratejik', why: 'Merkezi erken açmadan kanat oyunu kurar.', threat: 'g3-Bg2 ile kanat hücumu' },
      { san: 'c3', from: 'c2', to: 'c3', leadsTo: 'Alapin Varyantı', tag: 'Sağlam', why: 'd4 sürerek devasa bir piyon merkezi kurmayı planlar.', threat: 'c3-d4 piyon piramidi' },
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Smith-Morra Gambiti', tag: 'Gambit', why: 'Piyon feda ederek yarı açık hatlarda taş fırtınası koparır.', threat: 'Hızlı gelişim' }
    ]
  },

  'e4 c5 Nf3': {
    openingName: 'Açık Sicilya Hazırlığı',
    eco: 'B27',
    title: '2. Nf3 - d4 Yarması Hazırlanıyor',
    whyThisMove: 'Beyaz atını geliştirerek bir sonraki hamlede d4 sürüşünü destekler.',
    whatItProtects: 'd4 karesi desteği.',
    whatItThreatens: '3.d4 sürüşü.',
    futurePlan: '3.d4 cxd4 4.Nxd4 ile atı merkeze yerleştirmek.',
    coachTip: 'Siyah 2... d6 (Najdorf/Dragon), 2... Nc6 (Klasik/Sveshnikov) veya 2... e6 (Taimanov/Kan) ile karşılık verebilir.',
    candidates: [
      { san: 'd6', from: 'd7', to: 'd6', leadsTo: 'Najdorf veya Dragon Varyantı', tag: 'En Popüler', why: 'e5 i kontrol eder ve c8 filinin önünü açar.', threat: 'Merkez kontrolü' },
      { san: 'Nc6', from: 'b8', to: 'c6', leadsTo: 'Klasik Sicilya / Sveshnikov', tag: 'Aktif', why: 'd4 karesine baskıyı artırır.', threat: 'Merkez mücadelesi' },
      { san: 'e6', from: 'e7', to: 'e6', leadsTo: 'Taimanov / Kan / Dört At', tag: 'Esnek', why: 'd5 sürüşünü hazırlar.', threat: 'Merkez yarması' }
    ]
  },

  'e4 c5 Nf3 d6': {
    openingName: 'Sicilya Savunması (d6 Hattı)',
    eco: 'B50',
    title: '2... d6 - Najdorf & Dragon Yol Ayrımı',
    whyThisMove: 'Siyah e5 karesini kontrol etti ve beyazın e5 sürüşünü kesti.',
    whatItProtects: 'e5 ve c5 kareleri.',
    whatItThreatens: 'Gelişim.',
    futurePlan: '3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 ile açık Sicilya nın kalbine girmek.',
    coachTip: 'Şimdi 3.d4 oyna! cxd4 takasından sonra atla alacaksın.',
    candidates: [
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Açık Sicilya Ana Hat (Najdorf / Dragon)', tag: 'Ana Hat', why: 'Merkezi açar ve taşlara serbest yollar sağlar.', threat: 'Merkez hakimiyeti' },
      { san: 'Bb5+', from: 'f1', to: 'b5', leadsTo: 'Moskova Varyantı', tag: 'Konumsal', why: 'Şah çekerek taşları sadeleştirir.', threat: 'Açmaz ve takas' }
    ]
  },

  'e4 c5 Nf3 d6 d4': {
    openingName: 'Açık Sicilya: Merkez Patlaması',
    eco: 'B54',
    title: '3. d4 - Merkezi Açma Hamlesi',
    whyThisMove: 'Beyaz d4 sürerek merkez piyon takasını başlatır.',
    whatItProtects: 'd4 piyonu vezir ve atla korunur.',
    whatItThreatens: 'c5 piyonunu almak.',
    futurePlan: 'Siyah cxd4 aldıktan sonra 4.Nxd4 ile at merkeze oturacak.',
    coachTip: 'Siyah cxd4 oynamak zorundadır.',
    candidates: [
      { san: 'cxd4', from: 'c5', to: 'd4', leadsTo: 'Açık Sicilya Takası', tag: 'Zorunlu', why: 'Merkez piyonu ile beyaz piyonu takas eder, c-hattı açılır.', threat: 'c-hattı üstünlüğü' }
    ]
  },

  'e4 c5 Nf3 d6 d4 cxd4 Nxd4': {
    openingName: 'Açık Sicilya Merkezi',
    eco: 'B54',
    title: '4. Nxd4 - At Merkezde!',
    whyThisMove: 'Beyaz piyonu atıyla aldı; at tahtanın kalbinde muazzam bir alana hükmediyor.',
    whatItProtects: 'Merkez kareler.',
    whatItThreatens: 'Gelişim.',
    futurePlan: 'Siyah 4... Nf6 ile e4 piyonuna saldıracak, beyaz 5.Nc3 ile koruyacak.',
    coachTip: 'Siyah Nf6 oynadığında atını c3 e çıkarak piyonunu koru.',
    candidates: [
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Najdorf veya Dragon Hazırlığı', tag: 'Ana Hat', why: 'Beyazın e4 piyonuna tempolu saldırır.', threat: 'e4 piyonunu almak' }
    ]
  },

  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6': {
    openingName: 'Açık Sicilya: e4 Saldırısı',
    eco: 'B54',
    title: '4... Nf6 - e4 Piyonu Tehdit Altında!',
    whyThisMove: 'Siyah atını f6 karesine geliştirerek beyazın savunmasız e4 piyonunu doğrudan hedef aldı.',
    whatItProtects: 'd5 karesine baskı.',
    whatItThreatens: '5... Nxe4 ile bedava merkez piyonu kazanmak.',
    futurePlan: 'Beyaz atını 5.Nc3 ile oyuna sokup piyonunu korumalıdır. Ardından Najdorf (5... a6) veya Dragon (5... g6) çatallanması başlar.',
    coachTip: '5.Nc3 oyna! Hem e4 piyonunu savunursun hem de atını en ideal karesine geliştirirsin.',
    candidates: [
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Sicilya Ana Hat (Najdorf / Dragon Yol Ayrımı)', tag: 'Ana Hat', why: 'e4 piyonunu korur ve vezir kanadı gelişimini tamamlar.', threat: 'Piyonu korumak ve rok hazırlığı' }
    ]
  },

  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3': {
    openingName: 'Açık Sicilya Ana Düğüm Noktası',
    eco: 'B54 / B90 / B70',
    title: '5. Nc3 - Büyük Sicilya Karar Noktası!',
    whyThisMove: 'Beyaz e4 piyonunu atıyla korudu. Şimdi sıra siyahta: Dünyanın en popüler varyantları bu hamlede seçilir!',
    whatItProtects: 'e4 ve d5 kareleri.',
    whatItThreatens: 'Gelişim üstünlüğü.',
    futurePlan: 'Siyah 5... a6 ile Najdorf, 5... g6 ile Dragon, 5... Nc6 ile Klasik Sicilya veya 5... e6 ile Scheveningen varyantını seçer.',
    coachTip: '5... a6 oynarsan efsanevi Najdorf Savunmasına girersin (Kasparov ve Fischer favorisi). 5... g6 oynarsan ateşli Dragon Varyantı başlar!',
    candidates: [
      { san: 'a6', from: 'a7', to: 'a6', leadsTo: 'Najdorf Varyantı (B90)', tag: 'En Popüler', why: 'b5 sürüşünü hazırlar; beyaz at ve fillerinin b5 karesine sıçramasını kesin olarak önler.', threat: 'b5 ile vezir kanadı karşı saldırısı' },
      { san: 'g6', from: 'g7', to: 'g6', leadsTo: 'Dragon Varyantı (B70)', tag: 'Agresif', why: 'Filini Bg7 ye koyarak c1-h8 büyük çaprazından beyaz merkeze ateş açar.', threat: 'Uzun çapraz hakimiyeti' },
      { san: 'Nc6', from: 'b8', to: 'c6', leadsTo: 'Klasik Sicilya (B56)', tag: 'Sağlam', why: 'd4 teki güçlü beyaz atı sorgular ve merkez mücadelesini kızıştırır.', threat: 'd4 atını takas etmek' },
      { san: 'e6', from: 'e7', to: 'e6', leadsTo: 'Scheveningen Varyantı (B80)', tag: 'Esnek', why: 'Küçük merkez piyon duvarı kurar (d6-e6), fil ve vezir kanallarını dengeler.', threat: 'Sağlam merkez kalesi' }
    ]
  },

  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6': {
    openingName: 'Sicilya Savunması: Najdorf Varyantı',
    eco: 'B90',
    title: '5... a6 - Kasparov & Fischer Silahı: Najdorf!',
    whyThisMove: 'Siyah b5 karesini tamamen kontrol altına aldı, beyaz taşların sıçramasını yasakladı ve vezir kanadı hücumu hazırladı.',
    whatItProtects: 'b5 karesi.',
    whatItThreatens: 'b5 ve e5 ile beyaz merkezi sarsmak.',
    futurePlan: 'Beyaz için 3 ana plan vardır: 6.Be3 (İngiliz Saldırısı - f3, Qd2, O-O-O ile mat hücumu), 6.Bg5 (Klasik Keskin Saldırı) veya 6.Be2 (Karpov Stratejik Varyantı).',
    coachTip: '6.Be3 oyna (İngiliz Saldırısı)! Ardından f3, Qd2 ve uzun rok atıp siyah şahına g4-h4 piyon fırtınası başlatacaksın.',
    candidates: [
      { san: 'Be3', from: 'c1', to: 'e3', leadsTo: 'İngiliz Saldırısı (English Attack)', tag: 'Agresif', why: 'f3 ve Qd2 hazırlığı yapar, uzun rok atıp şah kanadına piyon fırtınası koparır.', threat: 'g4-h4 piyon taarruzu' },
      { san: 'Bg5', from: 'c1', to: 'g5', leadsTo: 'Klasik Najdorf Hücumu', tag: 'Keskin Hat', why: 'f6 atını açmaza alır ve e6 piyon yapısını parçalamayı tehdit eder.', threat: 'Bxf6 ile piyon yapısını bozmak' },
      { san: 'Be2', from: 'f1', to: 'e2', leadsTo: 'Karpov / Konumsal Hat', tag: 'Sağlam', why: 'Sakin kısa rok hazırlar ve siyahın e5 sürüşünü merkezde karşılar.', threat: 'Pozisyonel hakimiyet' }
    ]
  },

  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6': {
    openingName: 'Sicilya Savunması: Dragon Varyantı',
    eco: 'B70',
    title: '5... g6 - Ejderhanın Uyanışı (Dragon Varyantı)',
    whyThisMove: 'Siyah piyon yapısını Ejderha takımyıldızına benzeterek Bg7 filini tahtanın en uzun çaprazına yerleştirmeye hazırlanır.',
    whatItProtects: 'Koyu renkli kareler.',
    whatItThreatens: 'Bg7 ile c3 atına ve vezir kanadına ölümcül çapraz ateşi.',
    futurePlan: 'Beyaz için tek kazanç planı: 6.Be3, 7.f3, 8.Qd2 ve 9.O-O-O ile Yugoslav Saldırısı patlatmak!',
    coachTip: '6.Be3 oyna! Yugoslav Saldırısı satrancın en kanlı ve taktik mücadelesidir: Kim önce mat ederse o kazanır!',
    candidates: [
      { san: 'Be3', from: 'c1', to: 'e3', leadsTo: 'Yugoslav Saldırısı (Yugoslav Attack)', tag: 'Ölümcül', why: 'Dragon filini takas etmek için Qd2 ve Bh6 planını başlatır.', threat: 'Bh6 ile ejderha filini ortadan kaldırmak' },
      { san: 'Be2', from: 'f1', to: 'e2', leadsTo: 'Klasik Dragon Sistemi', tag: 'Sağlam', why: 'Sakin kısa rok atarak konumsal oynar.', threat: 'Merkez kontrolü' }
    ]
  },

  'e4 c5 Nf3 Nc6': {
    openingName: 'Sicilya Savunması: Klasik Hat',
    eco: 'B30',
    title: '2... Nc6 - d4 Baskısı ve Rossolimo Seçeneği',
    whyThisMove: 'Siyah atını oyuna sokarak d4 karesindeki kontrolünü artırdı.',
    whatItProtects: 'd4 ve e5 kareleri.',
    whatItThreatens: 'Beyazın 3.d4 sürüşünü zorlaştırmak.',
    futurePlan: 'Beyaz 3.d4 ile Açık Sicilya yı seçebilir veya 3.Bb5 ile Rossolimo Saldırısı na geçip atı açmaza alabilir.',
    coachTip: 'Eğer teorik açık Sicilya dan kaçınmak istersen 3.Bb5 (Rossolimo) oyna. Magnus Carlsen bu hamleyle Dünya Şampiyonası kazandı!',
    candidates: [
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Açık Sicilya (Klasik & Sveshnikov)', tag: 'Ana Hat', why: 'Merkezi açar ve üstün gelişim arar.', threat: '3.d4 cxd4 4.Nxd4 ile merkez hakimiyeti' },
      { san: 'Bb5', from: 'f1', to: 'b5', leadsTo: 'Rossolimo Saldırısı', tag: 'Büyükusta Tercihi', why: 'c6 atını açmaza alır, Bxc6 ile siyahın piyon yapısını duble yapmayı tehdit eder.', threat: 'Bxc6 ile piyon yapısını bozmak' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Dört At Sicilya Oyunu', tag: 'Sağlam', why: 'Hafif taşları simetrik geliştirir.', threat: 'Merkez desteği' }
    ]
  },

  'e4 c5 Nf3 e6': {
    openingName: 'Sicilya Savunması: Fransız Yapısı',
    eco: 'B40',
    title: '2... e6 - Taimanov & Kan Varyantı Kapısı',
    whyThisMove: 'Siyah d5 merkez yarmasını hazırlar ve c8 filini iç hatta tutarak esnek savunma kurar.',
    whatItProtects: 'd5 ve f5 kareleri.',
    whatItThreatens: '3... d5 ile merkeze meydan okumak.',
    futurePlan: 'Beyaz 3.d4 sürerek merkezi açar.',
    coachTip: '3.d4 oyna! cxd4 takasından sonra atla alıp taşlarını hızla oyuna sok.',
    candidates: [
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Açık Taimanov / Kan / Scheveningen', tag: 'Ana Hat', why: 'Merkezi açar ve alan üstünlüğü kurar.', threat: 'Merkez patlaması' },
      { san: 'c3', from: 'c2', to: 'c3', leadsTo: 'Gecikmeli Alapin Sistemi', tag: 'Sağlam', why: 'd4 piyonunu c3 ile destekler.', threat: 'Merkez kalesi' }
    ]
  },

  'e4 c5 c3': {
    openingName: 'Sicilya: Alapin Varyantı',
    eco: 'B22',
    title: '2. c3 - Alapin Piyon Piramidi!',
    whyThisMove: 'Beyaz c3 sürerek d4 merkez piyonunu arkadan piyonla desteklemeyi ve devasa bir merkez piramidi kurmayı hedefler.',
    whatItProtects: 'd4 karesini korur.',
    whatItThreatens: '3.d4 ile tüm merkeze tek başına sahip olmak.',
    futurePlan: 'Siyah beyazın bu planını bozmak için iki büyük karşı saldırı yapar: 2... d5 (merkezi anında patlatmak) veya 2... Nf6 (e4 piyonuna tempolu vurmak).',
    coachTip: 'Siyah 2... d5 oynarsa 3.exd5 Qxd5 4.d4 ile merkeze yerleş. Siyah 2... Nf6 oynarsa 3.e5 Nd5 4.d4 ile atı kov!',
    candidates: [
      { san: 'd5', from: 'd7', to: 'd5', leadsTo: 'Alapin Merkez Karşı Darbesi', tag: 'Ana Hat', why: 'Beyaz henüz d4 süremeden e4 piyonunu doğrudan hedef alır.', threat: 'exd5 Qxd5 ile veziri oyuna sokmak' },
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Alapin e4 Hücumu', tag: 'Aktif', why: 'e4 piyonuna saldırarak beyazı e5 sürmeye zorlar.', threat: 'e4 piyonunu almak' }
    ]
  },

  'e4 c5 Nc3': {
    openingName: 'Kapalı Sicilya',
    eco: 'B23',
    title: '2. Nc3 - Kapalı Sicilya: Konumsal Çatışma',
    whyThisMove: 'Beyaz d4 sürüşünü erteleyerek merkezi kapalı tutar ve vezir kanadı taşlarını geliştirir.',
    whatItProtects: 'd5 karesi.',
    whatItThreatens: 'g3-Bg2 ve f4 ile şah kanadı hücumu hazırlamak.',
    futurePlan: 'Siyah 2... Nc6 veya 2... d6 ile gelişimini sürdürür.',
    coachTip: 'Şimdi g3 oyna! Filini Bg2 ye koyup şah kanadından f4 sürüşüyle fırtına koparacaksın.',
    candidates: [
      { san: 'Nc6', from: 'b8', to: 'c6', leadsTo: 'Kapalı Sicilya Ana Hat', tag: 'Klasik', why: 'Taşını doğal karesine çıkarak d4 ve e5 i kontrol eder.', threat: 'Merkez kontrolü' },
      { san: 'd6', from: 'd7', to: 'd6', leadsTo: 'Kapalı Sicilya Esnek Hat', tag: 'Sağlam', why: 'e5 karesini kontrol eder.', threat: 'Esnek gelişim' }
    ]
  },

  // ========================================
  // 1.e4 e6 (FRANSIZ SAVUNMASI)
  // ========================================
  'e4 e6': {
    openingName: 'Fransız Savunması',
    eco: 'C00',
    title: '1... e6 - Fransız Savunması: Katı Merkez Hazırlığı',
    whyThisMove: 'Siyah bir sonraki hamlede d5 sürerek beyazın e4 piyonuna doğrudan saldırmayı hazırlar.',
    whatItProtects: 'd5 karesine piyon desteği sağlar.',
    whatItThreatens: 'Bir sonraki hamlede 2... d5 ile merkeze meydan okumak.',
    futurePlan: 'Beyaz 2.d4 sürerek büyük piyon merkezini kurmalıdır. Ardından siyah 2... d5 oynadığında İlerleme (3.e5) veya Klasik (3.Nc3) seçimi yapılır.',
    coachTip: '2.d4 oyna! Siyahın d5 sürüşünden önce merkeze tam olarak hakim olmalısın.',
    candidates: [
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Fransız Ana Hat (İlerleme, Winawer, Tarrasch)', tag: 'Ana Hat', why: 'e4 ve d4 piyonlarıyla devasa bir merkez kurar.', threat: 'Tam merkez hakimiyeti' },
      { san: 'd3', from: 'd2', to: 'd3', leadsTo: 'Kral-Hint Saldırısı (KIA)', tag: 'Esnek', why: 'Merkezi erken açmadan şah kanadı hücumu hazırlar.', threat: 'g3-Bg2 ile kanat hücumu' },
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Fransız Açık Hat', tag: 'Klasik', why: 'Hafif taşı doğal karesine geliştirir.', threat: 'Gelişim' }
    ]
  },

  'e4 e6 d4': {
    openingName: 'Fransız Savunması: Çift Merkez',
    eco: 'C00',
    title: '2. d4 - Beyaz İdeal Merkezi Kurdu',
    whyThisMove: 'Beyaz e4 ve d4 karelerine iki güçlü piyon yerleştirerek merkeze hükmetti.',
    whatItProtects: 'c5 ve e5 kareleri kontrol altındadır.',
    whatItThreatens: 'Gelişim üstünlüğü.',
    futurePlan: 'Siyah 2... d5 ile e4 piyonuna derhal saldıracaktır.',
    coachTip: 'Siyah 2... d5 oynadığında 3.e5 (İlerleme) veya 3.Nc3 (Klasik/Winawer) oynayabilirsin.',
    candidates: [
      { san: 'd5', from: 'd7', to: 'd5', leadsTo: 'Fransız Karşı Darbesi (Ana Hat)', tag: 'Ana Hat', why: 'e4 piyonuna doğrudan saldırır ve merkezde hak talep eder.', threat: 'e4 piyonunu almak' },
      { san: 'c5', from: 'c7', to: 'c5', leadsTo: 'Franco-Benoni Savunması', tag: 'Sürpriz', why: 'd4 merkez piyonuna kanattan baskı kurar.', threat: 'd4 piyonunu takasa zorlamak' }
    ]
  },

  'e4 e6 d4 d5': {
    openingName: 'Fransız Savunması: Merkez Çatışması',
    eco: 'C01',
    title: '2... d5 - e4 Piyonuna Doğrudan Meydan Okuma!',
    whyThisMove: 'Siyah merkez piyonunu sürdü; beyazın e4 piyonunu tehdit ediyor.',
    whatItProtects: 'd5 piyonu e6 ile korunur.',
    whatItThreatens: 'dxe4 ile piyon kazanmak.',
    futurePlan: 'BEYAZIN SEÇENEKLERİ: 3.e5 (İlerleme - Alan Kazanır), 3.Nc3 (Winawer/Klasik - En Keskin), 3.Nd2 (Tarrasch - Sağlam), 3.exd5 (Değişme - Sakin).',
    coachTip: '3.e5 sürerek siyahın şah kanadını boğabilirsin ya da 3.Nc3 oynayarak keskin bir savaşa girebilirsin.',
    candidates: [
      { san: 'e5', from: 'e4', to: 'e5', leadsTo: 'Fransız İlerleme Varyantı (Advance)', tag: 'Popüler', why: 'Merkezi kilitler, f6 karesini atın elinden alır ve alan üstünlüğü sağlar.', threat: 'Siyahı şah kanadında boğmak' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Winawer veya Klasik Fransız', tag: 'Büyükusta Tercihi', why: 'e4 piyonunu en aktif şekilde korur.', threat: 'e4 savunması ve gelişim' },
      { san: 'Nd2', from: 'b1', to: 'd2', leadsTo: 'Tarrasch Varyantı', tag: 'Sağlam', why: 'Bb4 açmazından kaçınır ve c3 ile merkezi desteklemeyi sağlar.', threat: 'Pozisyonel kontrol' },
      { san: 'exd5', from: 'e4', to: 'd5', leadsTo: 'Değişme Varyantı (Exchange)', tag: 'Sakin', why: 'Pozisyonu simetrik ve açık hale getirir.', threat: 'Merkezi sadeleştirmek' }
    ]
  },

  'e4 e6 d4 d5 e5': {
    openingName: 'Fransız: İlerleme Varyantı',
    eco: 'C02',
    title: '3. e5 - Alan Üstünlüğü ve Kilitli Merkez',
    whyThisMove: 'Beyaz piyonunu sürerek siyahın şah kanadına doğru bir kama soktu ve Nf6 hamlesini engelledi.',
    whatItProtects: 'f6 ve d6 karelerini baskı altına alır.',
    whatItThreatens: 'Şah kanadı hücumu başlatmak.',
    futurePlan: 'Siyah şimdi d4 piyonuna 3... c5 ile kanattan saldırmak ZORUNDADIR! Beyaz ise c3 ile merkezi destekleyecektir.',
    coachTip: 'Siyah c5 oynayacaktır. Sen c3 ile d4 piyonunu sağlam tutacaksın!',
    candidates: [
      { san: 'c5', from: 'c7', to: 'c5', leadsTo: 'İlerleme c5 Karşı Saldırısı', tag: 'Zorunlu', why: 'Beyazın piyon zincirinin temeli olan d4 e tempolu darbe vurur.', threat: 'd4 piyonunu yıkmak' }
    ]
  },

  // ========================================
  // 1.e4 c6 (CARO-KANN SAVUNMASI)
  // ========================================
  'e4 c6': {
    openingName: 'Caro-Kann Savunması',
    eco: 'B10',
    title: '1... c6 - Caro-Kann: Aşılmaz Taş Duvar',
    whyThisMove: 'Siyah c6 sürerek bir sonraki hamlede d5 yapmaya hazırlanır. Fransız dan farkı: c8 filinin önü kapanmaz!',
    whatItProtects: 'd5 karesini destekler.',
    whatItThreatens: '2... d5 ile merkeze saldırmak.',
    futurePlan: 'Beyaz 2.d4 oynayarak merkezi ele geçirmelidir.',
    coachTip: '2.d4 oyna! Siyah d5 oynadığında İlerleme (3.e5) veya Klasik (3.Nc3) hatlarını seçebilirsin.',
    candidates: [
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Caro-Kann Ana Hat (İlerleme, Klasik, Panov)', tag: 'Ana Hat', why: 'Kusursuz piyon merkezi kurar.', threat: 'Merkez kontrolü' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'İki At Caro-Kann', tag: 'Esnek', why: 'Hafif taşı geliştirir ve d5 i bekler.', threat: 'Gelişim' },
      { san: 'c4', from: 'c2', to: 'c4', leadsTo: 'Hızlandırılmış Panov Saldırısı', tag: 'Agresif', why: 'd5 karesine erken kanat baskısı kurar.', threat: 'Açık hatlar' }
    ]
  },

  'e4 c6 d4': {
    openingName: 'Caro-Kann: Çift Merkez',
    eco: 'B12',
    title: '2. d4 - Beyaz Merkeze Yerleşti',
    whyThisMove: 'Beyaz d4 sürerek merkez piyon çiftini oluşturdu.',
    whatItProtects: 'c5 ve e5 kareleri.',
    whatItThreatens: 'Gelişim üstünlüğü.',
    futurePlan: 'Siyah şimdi 2... d5 oynayacaktır.',
    coachTip: 'Siyah d5 oynadığında 3.e5 sürerek alan kazanabilirsin.',
    candidates: [
      { san: 'd5', from: 'd7', to: 'd5', leadsTo: 'Caro-Kann Karar Noktası', tag: 'Ana Hat', why: 'e4 piyonuna doğrudan saldırır.', threat: 'e4 piyonunu almak' }
    ]
  },

  'e4 c6 d4 d5': {
    openingName: 'Caro-Kann: Merkez Savaşı',
    eco: 'B12',
    title: '2... d5 - e4 Piyonu Sorgulanıyor',
    whyThisMove: 'Siyah d5 karesine sağlam bir kale kurdu ve e4 piyonunu tehdit etti.',
    whatItProtects: 'd5 piyonu c6 ile desteklenir.',
    whatItThreatens: 'dxe4 ile piyon almak.',
    futurePlan: 'Beyaz 3.e5 (İlerleme Varyantı) veya 3.Nc3 (Klasik Varyant) ile devam eder.',
    coachTip: '3.e5 oynarsan siyah filini Bf5 ile dışarı çıkarır. 3.Nc3 oynarsan siyah dxe4 takas eder.',
    candidates: [
      { san: 'e5', from: 'e4', to: 'e5', leadsTo: 'Caro-Kann İlerleme Varyantı', tag: 'En Popüler', why: 'Alanı kilitler ve siyah şah kanadını kısıtlar.', threat: 'Alan avantajı' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Klasik / Capablanca Varyantı', tag: 'Büyükusta Tercihi', why: 'e4 piyonunu korur.', threat: 'Taş üstünlüğü' },
      { san: 'exd5', from: 'e4', to: 'd5', leadsTo: 'Panov-Botvinnik / Değişme', tag: 'Saldırgan', why: 'cxd5 sonrası c4 ile merkezi parçalar.', threat: 'c-hattı baskısı' }
    ]
  },

  'e4 c6 d4 d5 e5': {
    openingName: 'Caro-Kann: İlerleme Varyantı',
    eco: 'B12',
    title: '3. e5 - Alan Üstünlüğü',
    whyThisMove: 'Beyaz piyonu e5 e sürerek alanı kapattı.',
    whatItProtects: 'f6 ve d6 kareleri.',
    whatItThreatens: 'Şah kanadı manevraları.',
    futurePlan: 'Siyah filini 3... Bf5 ile piyon zincirinin DIŞINA çıkarır!',
    coachTip: 'Siyah 3... Bf5 oynadığında filine dikkat et. Sen Nf3 veya g4-h4 ile fili taciz edebilirsin.',
    candidates: [
      { san: 'Bf5', from: 'c8', to: 'f5', leadsTo: 'Caro-Kann İlerleme Ana Hat (Fil Dışarıda)', tag: 'Ana Hat', why: 'Piyon zinciri kapanmadan önce fili aktif çapraza yerleştirir.', threat: 'Aktif fil oyunu' },
      { san: 'c5', from: 'c6', to: 'c5', leadsTo: 'Arkell-Khenkin Karşı Saldırısı', tag: 'Taktik', why: 'd4 piyonunu anında baltalar.', threat: 'Merkez takası' }
    ]
  },

  // ========================================
  // 1.e4 d5 (İSKANDİNAV SAVUNMASI)
  // ========================================
  'e4 d5': {
    openingName: 'İskandinav Savunması',
    eco: 'B01',
    title: '1... d5 - Erken Merkez Meydan Okuması',
    whyThisMove: 'Siyah hiçbir hazırlık hamlesi yapmadan 1. hamlede beyazın e4 piyonuna saldırdı.',
    whatItProtects: 'd5 piyonu.',
    whatItThreatens: 'dxe4 ile beyaz piyonu almak.',
    futurePlan: 'Beyaz 2.exd5 ile piyonu almalıdır. Siyah vezirle (Qxd5) aldığında 3.Nc3 ile vezire tempolu hücum yapılır!',
    coachTip: '2.exd5 oyna! Siyah veziriyle geri aldığında 3.Nc3 oynayıp bedava tempo kazanacaksın.',
    candidates: [
      { san: 'exd5', from: 'e4', to: 'd5', leadsTo: 'İskandinav Ana Hat (2... Qxd5 veya 2... Nf6)', tag: 'En Güçlü', why: 'Tehdit altındaki piyonu alır ve siyahı erken vezir çıkarmaya zorlar.', threat: 'Tempo kazanmak' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Dunst Geçişi', tag: 'Pasif', why: 'e4 piyonunu korur.', threat: 'Gelişim' }
    ]
  },

  'e4 d5 exd5': {
    openingName: 'İskandinav: Piyon Alındı',
    eco: 'B01',
    title: '2. exd5 - Siyahın Kararı',
    whyThisMove: 'Beyaz piyonu aldı ve siyahı erken vezir çıkarmaya zorladı.',
    whatItProtects: 'd5 karesi.',
    whatItThreatens: 'Piyon önde olmak.',
    futurePlan: 'Siyah 2... Qxd5 ile alırsa klasik İskandinav, 2... Nf6 oynarsa Modern Portekiz Gambiti başlar.',
    coachTip: 'Siyah Qxd5 oynarsa hemen 3.Nc3 ile vezirine saldır!',
    candidates: [
      { san: 'Qxd5', from: 'd8', to: 'd5', leadsTo: 'Mieses-Kotroc Klasik İskandinav', tag: 'Klasik', why: 'Merkez piyonunu vezirle geri alır.', threat: 'Merkez veziri' },
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Modern İskandinav Gambiti', tag: 'Dinamik', why: 'Veziri erken çıkarmadan piyonu atla almayı hedefler.', threat: 'Hızlı gelişim' }
    ]
  },

  'e4 d5 exd5 Qxd5': {
    openingName: 'İskandinav: Vezir Erken Çıktı!',
    eco: 'B01',
    title: '2... Qxd5 - Beyaza Bedava Tempo!',
    whyThisMove: 'Siyah veziriyle piyonu geri aldı ancak vezir erken safhada açıkta kaldı.',
    whatItProtects: 'Merkez kontrolü.',
    whatItThreatens: 'Gelişim.',
    futurePlan: 'BEYAZIN ZORUNLU HAMLESİ: 3.Nc3! ile siyah vezire saldırıp tempolu at geliştirmek.',
    coachTip: '3.Nc3 oyna! Vezire saldırırken aynı zamanda atını en doğal karesine geliştirmiş olacaksın.',
    candidates: [
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'İskandinav Tempolu At Gelişimi (Qa5, Qd6, Qd8)', tag: 'Ana Hat', why: 'Vezire tempolu hücum ederek taş geliştirir.', threat: 'Veziri kovalamak' }
    ]
  },

  // ========================================
  // 1.e4 Nf6 (ALEKHINE SAVUNMASI)
  // ========================================
  'e4 Nf6': {
    openingName: 'Alekhine Savunması',
    eco: 'B02',
    title: '1... Nf6 - Piyonları Üzerine Çekme Tuzağı!',
    whyThisMove: 'Siyah e4 piyonuna saldırarak beyazı piyonlarını ileri sürmeye ve aşırı uzamaya kışkırtır.',
    whatItProtects: 'd5 karesine baskı.',
    whatItThreatens: 'e4 piyonunu almak.',
    futurePlan: 'Beyaz 2.e5 ile atı kovalayabilir veya 2.Nc3 ile piyonu koruyabilir.',
    coachTip: '2.e5 oyna! Atı d5 e kaçmaya zorla, ardından d4 ve c4 ile merkezi fethet.',
    candidates: [
      { san: 'e5', from: 'e4', to: 'e5', leadsTo: 'Alekhine Ana Hat (Dört Piyon veya Modern)', tag: 'Ana Hat', why: 'Atı kovalayarak alan kazanır.', threat: 'Atı tahtadan sürmek' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Viyana Oyunu Geçişi', tag: 'Sakin', why: 'e4 piyonunu korur.', threat: 'Gelişim' }
    ]
  },

  'e4 Nf6 e5': {
    openingName: 'Alekhine: At Kovalama',
    eco: 'B02',
    title: '2. e5 - At Kaçmak Zorunda!',
    whyThisMove: 'Beyaz piyonunu sürerek atı tehdit etti.',
    whatItProtects: 'f6 karesi.',
    whatItThreatens: 'Atı düşürmek.',
    futurePlan: 'Siyah 2... Nd5 oynamak zorundadır.',
    coachTip: 'Siyah atını d5 e kaçacaktır. Ardından 3.d4 süreceksin.',
    candidates: [
      { san: 'Nd5', from: 'f6', to: 'd5', leadsTo: 'Alekhine Merkez Atı', tag: 'Zorunlu', why: 'Atı tahtanın ortasındaki güçlü d5 karesine yerleştirir.', threat: 'Merkez kalesi' }
    ]
  },

  'e4 Nf6 e5 Nd5': {
    openingName: 'Alekhine: Karar Noktası',
    eco: 'B03',
    title: '2... Nd5 - At Merkezde',
    whyThisMove: 'Siyah atını d5 e yerleştirdi.',
    whatItProtects: 'c3 ve e3 kareleri.',
    whatItThreatens: 'Gelişim.',
    futurePlan: 'Beyaz 3.d4 ile merkezi sağlama almalı, ardından c4 ile atı tekrar sorgulamalıdır.',
    coachTip: '3.d4 oyna! Merkez piyon çiftini kur.',
    candidates: [
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Modern Alekhine Varyantı', tag: 'Ana Hat', why: 'Sağlam piyon merkezi kurar.', threat: 'Merkez kontrolü' },
      { san: 'c4', from: 'c2', to: 'c4', leadsTo: 'Dört Piyon Saldırısı Hazırlığı', tag: 'Agresif', why: 'Atı bir kez daha kovalar.', threat: 'Atı b6 ya sürmek' }
    ]
  },

  // ========================================
  // 1.e4 d6 (PIRC / MODERN SAVUNMA)
  // ========================================
  'e4 d6': {
    openingName: 'Pirc Savunması',
    eco: 'B07',
    title: '1... d6 - Pirc: Esnek Hipermodern Karşı Koyuş',
    whyThisMove: 'Siyah e5 karesini kontrol eder ve Nf6, g6, Bg7 hazırlığı yapar.',
    whatItProtects: 'e5 ve c5 kareleri.',
    whatItThreatens: 'Gelişim.',
    futurePlan: 'Beyaz 2.d4 sürerek devasa bir piyon merkezi kurmalıdır.',
    coachTip: '2.d4 oyna! Beyazın tüm merkeze hükmetmesine izin veriyor.',
    candidates: [
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Pirc / Modern Ana Hat', tag: 'Ana Hat', why: 'Merkeze tam hakimiyet sağlar.', threat: 'Çift merkez piyonu' },
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Sakin Gelişim', tag: 'Klasik', why: 'Hafif taşı doğal karesine çıkar.', threat: 'Gelişim' }
    ]
  },

  'e4 d6 d4': {
    openingName: 'Pirc: Beyaz Merkezde',
    eco: 'B07',
    title: '2. d4 - Beyaz Alanı Fethetti',
    whyThisMove: 'Beyaz e4 ve d4 piyonlarıyla tam merkez hakimiyeti kurdu.',
    whatItProtects: 'c5 ve e5 kareleri.',
    whatItThreatens: 'Gelişim.',
    futurePlan: 'Siyah 2... Nf6 ile e4 piyonuna tempolu saldıracaktır.',
    coachTip: 'Siyah Nf6 oynadığında atını 3.Nc3 ile geliştirip piyonunu koru.',
    candidates: [
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Pirc Ana Hat (3.Nc3)', tag: 'Ana Hat', why: 'e4 piyonuna saldırır.', threat: 'e4 piyonunu almak' },
      { san: 'g6', from: 'g7', to: 'g6', leadsTo: 'Modern Savunma / Robatsch', tag: 'Hipermodern', why: 'Kanat filini Bg7 ye hazırlayarak merkeze uzaktan nişan alır.', threat: 'Uzun çapraz kontrolü' }
    ]
  },

  // ========================================
  // 1. d4 DALLARI (VEZİR PİYONU, HİNT, LONDRA)
  // ========================================
  'd4': {
    openingName: 'Vezir Piyonu Açılışı',
    eco: 'D00 / E00 / A40',
    title: '1. d4 - Sağlam Merkez ve Stratejik Ustalık',
    whyThisMove: 'Beyaz vezir tarafından korunan sağlam bir merkez piyonu sürdü. e5 ve c5 karelerini kontrol altına aldı.',
    whatItProtects: 'd4 piyonu vezir tarafından doğal olarak korunur.',
    whatItThreatens: 'e4 sürerek tam merkez hakimiyeti kurmak.',
    futurePlan: 'c4 ile Vezir Gambiti oynamak veya Bf4 ile Londra Sistemini kurmak.',
    coachTip: '1.d4 oyunları taktik tuzaklardan ziyade derin konumsal planlar ve piyon yapıları etrafında döner.',
    candidates: [
      { san: 'd5', from: 'd7', to: 'd5', leadsTo: 'Kapalı Oyunlar (Vezir Gambiti, Londra, Slav)', tag: 'Klasik', why: 'Merkezde eşitlik kurar ve beyazın e4 sürmesini engeller.', threat: 'Merkez kontrolü' },
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Hint Savunmaları (Şah-Hint, Nimzo-Hint, Grünfeld)', tag: 'Hint Savunmaları', why: 'Beyazın 2.e4 sürmesini engeller ve esnek kanat oyunları hazırlar.', threat: 'e4 karesi kontrolü' },
      { san: 'f5', from: 'f7', to: 'f5', leadsTo: 'Hollanda Savunması', tag: 'Agresif', why: 'Doğrudan e4 karesini kanat piyonuyla ablukaya alır.', threat: 'e4 karesi ablukası' },
      { san: 'e6', from: 'e7', to: 'e6', leadsTo: 'Fransız veya Vezir Gambiti Geçişi', tag: 'Esnek', why: 'd5 sürüşünü destekler.', threat: 'Sağlam piyon desteği' }
    ]
  },

  'd4 d5': {
    openingName: 'Kapalı Oyun (Çift Vezir Piyonu)',
    eco: 'D00',
    title: '1... d5 - Simetrik Vezir Piyonu',
    whyThisMove: 'Siyah beyazın e4 sürmesini engelledi ve merkezde eşit hak talep etti.',
    whatItProtects: 'e4 ve c4 kareleri.',
    whatItThreatens: 'Merkez eşitliği.',
    futurePlan: 'Beyaz için iki büyük yol: 2.c4 ile Vezir Gambiti veya 2.Bf4 ile Londra Sistemi.',
    coachTip: '2.c4 oynamak büyükustaların 1 numaralı silahıdır. Piyonu feda gibi gösterip merkezi parçalarsın.',
    candidates: [
      { san: 'c4', from: 'c2', to: 'c4', leadsTo: 'Vezir Gambiti (Reddedilen, Kabul Edilen, Slav)', tag: 'Büyükusta Tercihi', why: 'd5 piyonunu kanada saptırıp e4 sürmeyi amaçlar.', threat: 'd5 piyonunu saptırmak' },
      { san: 'Bf4', from: 'c1', to: 'f4', leadsTo: 'Londra Sistemi', tag: 'Granit Piramit', why: 'e3 sürmeden önce fili dışarı çıkarıp piramit kurar.', threat: 'Aşılmaz taş duvarı' },
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Colle / Torre Saldırısı', tag: 'Sakin Gelişim', why: 'e5 karesini kontrol eder.', threat: 'Gelişim' }
    ]
  },

  'd4 d5 c4': {
    openingName: 'Vezir Gambiti',
    eco: 'D06',
    title: '2. c4 - Vezir Gambiti Meydan Okuması!',
    whyThisMove: 'Beyaz kanat piyonu ile siyahın d5 merkez piyonunu sarsar.',
    whatItProtects: 'c4 piyonu.',
    whatItThreatens: 'dxc4 takasıyla siyahı merkezden etmek.',
    futurePlan: 'cxd5 ile yarı açık c-hattı kurmak veya e4 ile tahtanın merkezini ele geçirmek.',
    coachTip: 'Siyah 2... e6 oynarsa Reddedilen Vezir Gambiti (QGD), 2... c6 oynarsa Slav Savunması, 2... dxc4 oynarsa Kabul Edilen Vezir Gambiti (QGA) olur.',
    candidates: [
      { san: 'e6', from: 'e7', to: 'e6', leadsTo: 'Reddedilen Vezir Gambiti (QGD)', tag: 'En Sağlam', why: 'd5 merkez kalesini çelik gibi korur.', threat: 'Merkezi tutmak' },
      { san: 'c6', from: 'c7', to: 'c6', leadsTo: 'Slav Savunması', tag: 'Büyükusta Tercihi', why: 'c8 filini hapsetmeden d5 i korur.', threat: 'Fil için serbest yol' },
      { san: 'dxc4', from: 'd5', to: 'c4', leadsTo: 'Kabul Edilen Vezir Gambiti (QGA)', tag: 'Açık Oyun', why: 'Piyonu alır ve c5 ile karşı oyun kurar.', threat: 'Merkezi boşaltmak' }
    ]
  },

  'd4 d5 c4 e6': {
    openingName: 'Reddedilen Vezir Gambiti (QGD)',
    eco: 'D30',
    title: '2... e6 - Çelik Gibi Sağlam Savunma',
    whyThisMove: 'Siyah piyonu almadı; e6 ile d5 kalesini korumaya aldı.',
    whatItProtects: 'd5 karesi.',
    whatItThreatens: 'Merkez dengesi.',
    futurePlan: 'Beyaz 3.Nc3 ile d5 baskısını artırır, siyah 3... Nf6 ile savunur, ardından 4.Bg5 ile meşhur açmaz savaşı başlar.',
    coachTip: '3.Nc3 oyna! d5 karesine ikinci darbeyi indireceksin.',
    candidates: [
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Klasik QGD', tag: 'Ana Hat', why: 'd5 karesine baskıyı artırır.', threat: 'd5 piyonuna yüklenmek' },
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Sakin QGD', tag: 'Esnek', why: 'Gelişimi tamamlar.', threat: 'Merkez kontrolü' }
    ]
  },

  'd4 d5 c4 c6': {
    openingName: 'Slav Savunması',
    eco: 'D10',
    title: '2... c6 - Slav Savunması: Esnek Granit',
    whyThisMove: 'Siyah d5 piyonunu c6 ile destekledi. Fransız ve QGD nin aksine c8 filinin çaprazı açık kaldı!',
    whatItProtects: 'd5 piyonu.',
    whatItThreatens: 'İleride dxc4 alıp b5 ile tutma tehdidi.',
    futurePlan: 'Beyaz 3.Nf3 veya 3.Nc3 ile gelişir; siyah filini dışarı çıkararak sağlam bir konuma oturur.',
    coachTip: '3.Nf3 oyna! Siyahın dxc4 almasını engelle ve şah kanadı gelişimini tamamla.',
    candidates: [
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Slav Ana Hat', tag: 'Ana Hat', why: 'dxc4 sürprizini önler ve merkezi kontrol eder.', threat: 'Gelişim üstünlüğü' },
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Slav Baskı Hattı', tag: 'Aktif', why: 'd5 piyonuna doğrudan baskı kurar.', threat: 'Merkez kontrolü' }
    ]
  },

  'd4 d5 Bf4': {
    openingName: 'Londra Sistemi',
    eco: 'D00',
    title: '2. Bf4 - Londra Sistemi (Granit Piramit)',
    whyThisMove: 'Beyaz e3 sürmeden önce koyu renkli filini piyon zincirinin dışına çıkartarak tahtaya hükmetti.',
    whatItProtects: 'e5 karesini kontrol eder.',
    whatItThreatens: 'Sağlam bir taş piramidi (c3, d4, e3) kurmak.',
    futurePlan: '3.e3, 4.Nf3, 5.c3, 6.Nbd2 ile aşılmaz bir kale kurup şah kanadına hücum etmek.',
    coachTip: 'Siyah 2... Nf6 veya 2... c5 oynayacaktır. Sen planını bozma: e3 sür ve piramidi tamamla!',
    candidates: [
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Klasik Londra Yanıtı', tag: 'Ana Hat', why: 'Doğal taş gelişimi.', threat: 'e4 karesi kontrolü' },
      { san: 'c5', from: 'c7', to: 'c5', leadsTo: 'Londra ya Karşı Merkez Darbesi', tag: 'Agresif', why: 'd4 dayanağına derhal saldırır.', threat: 'Merkezi açmak' }
    ]
  },

  // 1.d4 Nf6 (HİNT SAVUNMALARI)
  'd4 Nf6': {
    openingName: 'Hint Savunmaları Başlangıcı',
    eco: 'A45 / E00',
    title: '1... Nf6 - Hint Savunmaları Kapısı',
    whyThisMove: 'Siyah atıyla beyazın 2.e4 sürmesini engelledi ve son derece zengin taktik/stratejik kapılar açtı.',
    whatItProtects: 'e4 ve d5 kareleri.',
    whatItThreatens: 'Gelişim.',
    futurePlan: 'Beyaz 2.c4 ile büyükustaların favori yolunu seçebilir (Şah-Hint, Nimzo-Hint, Grünfeld) veya 2.Bf4 ile Londra Sistemi kurabilir.',
    coachTip: '2.c4 oynamak büyükusta klasiğidir. Siyah 2... g6 oynarsa Şah-Hint, 2... e6 oynarsa Nimzo-Hint e girersin.',
    candidates: [
      { san: 'c4', from: 'c2', to: 'c4', leadsTo: 'Şah-Hint, Nimzo-Hint, Grünfeld, Benoni', tag: 'Büyükusta Tercihi', why: 'd5 karesine baskı kurar ve e4 sürüşünü hazırlar.', threat: 'Geniş merkez' },
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Réti / Torre Saldırısı', tag: 'Esnek', why: 'e5 i kontrol eder.', threat: 'Gelişim' },
      { san: 'Bf4', from: 'c1', to: 'f4', leadsTo: 'Londra Sistemi (Hint Yanıtına Karşı)', tag: 'Sağlam', why: 'Aşılmaz piramit kurar.', threat: 'Piramit düzeni' }
    ]
  },

  'd4 Nf6 c4': {
    openingName: 'Hint Savunmaları Ana Hat',
    eco: 'E00',
    title: '2. c4 - Beyaz Merkeze Baskı Kuruyor',
    whyThisMove: 'Beyaz c4 sürerek vezir kanadını açtı ve d5 karesine baskıyı artırdı.',
    whatItProtects: 'd5 karesi.',
    whatItThreatens: '3.Nc3 ve 4.e4 ile merkezi süpürmek.',
    futurePlan: 'Siyah 2... g6 ile Şah-Hint (KID) veya Grünfeld e, 2... e6 ile Nimzo-Hint e yönelir.',
    coachTip: 'Siyah 2... g6 oynarsa atını 3.Nc3 e çıkar.',
    candidates: [
      { san: 'g6', from: 'g7', to: 'g6', leadsTo: 'Şah-Hint (KID) veya Grünfeld Savunması', tag: 'En Popüler', why: 'Bg7 filiyle tahtanın uzun çaprazına nişan alır.', threat: 'Şah kanadı kalesi' },
      { san: 'e6', from: 'e7', to: 'e6', leadsTo: 'Nimzo-Hint veya Vezir-Hint', tag: 'Klasik', why: 'd5 sürüşünü ve Bb4 açmazını hazırlar.', threat: 'Açmaz tehdidi' },
      { san: 'c5', from: 'c7', to: 'c5', leadsTo: 'Modern Benoni Savunması', tag: 'Keskin', why: 'd4 piyonunu hemen kanattan bombalar.', threat: 'Asimetrik savaş' }
    ]
  },

  'd4 Nf6 c4 g6': {
    openingName: 'Şah-Hint / Grünfeld Hazırlığı',
    eco: 'E60',
    title: '2... g6 - Ejderha Gözü Açıldı',
    whyThisMove: 'Siyah şah filini g7 karesinden fianchetto yapmaya hazırlanır.',
    whatItProtects: 'f5 ve h5 kareleri.',
    whatItThreatens: 'Gelişim.',
    futurePlan: 'Beyaz 3.Nc3 ile e4 sürüşünü hazırlar; siyah 3... Bg7 ardından d6 ve e5 ile merkeze karşı hücum patlatır.',
    coachTip: '3.Nc3 oyna! e4 sürerek merkezi tamamen ele geçireceksin.',
    candidates: [
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Şah-Hint Ana Hat (3... Bg7)', tag: 'Ana Hat', why: 'e4 sürüşünü destekler.', threat: '4.e4 ile devasa merkez' },
      { san: 'Nf3', from: 'g1', to: 'f3', leadsTo: 'Fianchetto Sistemi', tag: 'Konumsal', why: 'Sakin taş gelişimi.', threat: 'Denge' }
    ]
  },

  // 1.d4 f5 (HOLLANDA SAVUNMASI)
  'd4 f5': {
    openingName: 'Hollanda Savunması',
    eco: 'A80',
    title: '1... f5 - Hollanda Savunması: Kanattan Karşı Hücum',
    whyThisMove: 'Siyah f-piyonunu sürerek e4 karesini doğrudan abluka altına aldı.',
    whatItProtects: 'e4 karesi.',
    whatItThreatens: 'İleride şah kanadından fırtına koparmak.',
    futurePlan: 'Beyaz 2.g3 ve Bg2 ile sakin fianchetto kurarak siyahın şah zayıflıklarını cezalandırabilir.',
    coachTip: '2.g3 oyna! Filini g2 ye koyup zayıf kalan siyah şah kanadına çaprazdan nişan al.',
    candidates: [
      { san: 'g3', from: 'g2', to: 'g3', leadsTo: 'Leningrad / Stonewall Hollanda', tag: 'Ana Hat', why: 'Bg2 ile uzun çaprazı ele geçirir.', threat: 'Şah çaprazı kontrolü' },
      { san: 'Bg5', from: 'c1', to: 'g5', leadsTo: 'Hopton Saldırısı', tag: 'Taktik', why: 'Siyahın e6 sürüşünü açmaza alır.', threat: 'Erken taş baskısı' }
    ]
  },

  // ========================================
  // 1. c4 (İNGİLİZ AÇILIŞI)
  // ========================================
  'c4': {
    openingName: 'İngiliz Açılışı',
    eco: 'A10',
    title: '1. c4 - İngiliz Açılışı: Kanattan Merkez Hakimiyeti',
    whyThisMove: 'Beyaz merkez piyonlarını sürmeden d5 karesini kanattan kontrol altına aldı (Ters Sicilya Mantığı).',
    whatItProtects: 'd5 karesi.',
    whatItThreatens: 'İleride Nc3 ve g3 ile uzun çaprazdan oyunu domine etmek.',
    futurePlan: 'Siyah 1... e5 oynarsa Ters Sicilya, 1... c5 oynarsa Simetrik İngiliz oluşur.',
    coachTip: 'Siyah 1... e5 oynadığında 2.Nc3 ile atını geliştir. Beyaz tahtada 1 tempo önde bir Sicilya oynuyor gibidir!',
    candidates: [
      { san: 'e5', from: 'e7', to: 'e5', leadsTo: 'Ters Sicilya Varyantı', tag: 'En Popüler', why: 'Merkezi alır ve açık oyun kurar.', threat: 'Merkez kontrolü' },
      { san: 'c5', from: 'c7', to: 'c5', leadsTo: 'Simetrik İngiliz', tag: 'Stratejik', why: 'Aynı stratejiyle karşılık verir.', threat: 'd4 karesi kontrolü' },
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Anglochetik / Hint Geçişi', tag: 'Esnek', why: 'Doğal gelişim.', threat: 'Merkez esnekliği' }
    ]
  },

  'c4 e5': {
    openingName: 'İngiliz Açılışı: Ters Sicilya',
    eco: 'A20',
    title: '1... e5 - Siyah Merkeze Yerleşti',
    whyThisMove: 'Siyah e5 sürerek merkez hakimiyeti kurdu.',
    whatItProtects: 'd4 ve f4 kareleri.',
    whatItThreatens: 'Gelişim.',
    futurePlan: 'Beyaz 2.Nc3 ile d5 karesine baskıyı artırır, ardından g3-Bg2 ile fili devreye sokar.',
    coachTip: '2.Nc3 oyna! d5 karesine ikinci baskıyı kur.',
    candidates: [
      { san: 'Nc3', from: 'b1', to: 'c3', leadsTo: 'Ters Sicilya Ana Hat', tag: 'Ana Hat', why: 'd5 karesine baskıyı artırır.', threat: 'd5 kontrolü' },
      { san: 'g3', from: 'g2', to: 'g3', leadsTo: 'Bremen / Fianchetto Varyantı', tag: 'Popüler', why: 'Filini g2 ye koyup e4 ve d5 i hedefler.', threat: 'Uzun çapraz hücumu' }
    ]
  },

  // ========================================
  // 1. Nf3 (RÉTI AÇILIŞI)
  // ========================================
  'Nf3': {
    openingName: 'Réti Açılışı / Zukertort',
    eco: 'A04',
    title: '1. Nf3 - Hipermodern Esneklik',
    whyThisMove: 'Beyaz atını en kusursuz gelişim karesine çıkararak siyahın 1... e5 sürüşünü engelledi.',
    whatItProtects: 'e5 ve d4 kareleri.',
    whatItThreatens: 'Merkez kontrolü.',
    futurePlan: 'g3, Bg2 ve c4 sürerek merkeze uzaktan baskı kurmak (Réti Sistemi) veya d4 sürerek Vezir Piyonuna geçmek.',
    coachTip: 'Satranç dünyasının en esnek hamlesidir. Siyahın oyun tarzını görüp ona göre d4 veya c4 e yönelebilirsin.',
    candidates: [
      { san: 'd5', from: 'd7', to: 'd5', leadsTo: 'Réti Ana Hat (c4 ile piyon sorgulanır)', tag: 'Klasik', why: 'Merkezde yer açar.', threat: 'Merkez hakimiyeti' },
      { san: 'Nf6', from: 'g8', to: 'f6', leadsTo: 'Simetrik Réti / Kral-Hint Saldırısı', tag: 'Esnek', why: 'Doğal gelişim.', threat: 'Taş dengesi' },
      { san: 'c5', from: 'c7', to: 'c5', leadsTo: 'İngiliz / Sicilya Geçişi', tag: 'Dinamik', why: 'd4 karesini kontrol eder.', threat: 'Kanat karşı atağı' }
    ]
  },

  'Nf3 d5': {
    openingName: 'Réti Sistemi: d5 Karşılığı',
    eco: 'A06',
    title: '1... d5 - Klasik Merkez Yanıtı',
    whyThisMove: 'Siyah merkez piyonunu sürdü.',
    whatItProtects: 'e4 ve c4 kareleri.',
    whatItThreatens: 'Merkez dengesi.',
    futurePlan: 'Beyaz 2.g3 ile şah filini fianchetto yapabilir veya 2.c4 ile Réti Gambitini patlatabilir.',
    coachTip: '2.g3 veya 2.c4 oyna! c4 oynarsan siyahın d5 piyonuna tempolu meydan okursun.',
    candidates: [
      { san: 'g3', from: 'g2', to: 'g3', leadsTo: 'Kral-Hint Saldırısı (KIA) / Réti', tag: 'Ana Hat', why: 'Bg2 filiyle merkeze uzaktan hükmeder.', threat: 'Fianchetto hücumu' },
      { san: 'c4', from: 'c2', to: 'c4', leadsTo: 'Réti Gambiti', tag: 'Agresif', why: 'd5 merkez piyonunu saptırmayı hedefler.', threat: 'Merkezi parçalamak' },
      { san: 'd4', from: 'd2', to: 'd4', leadsTo: 'Klasik Vezir Piyonu Geçişi', tag: 'Sağlam', why: 'Merkezi d4 ile kilitler.', threat: 'Sağlam merkez' }
    ]
  }
};

// Helper function to resolve future attack prediction for any candidate move
export function getFutureAttackForCandidate(cand: CandidateMove): string {
  if (cand.futureAttack) return cand.futureAttack;
  const san = cand.san;

  if (san.includes('+')) {
    return 'Şah çekerek inisiyatifi elinde tutar ve rakibi savunmaya zorlar.';
  }
  if (san === 'O-O' || san === 'O-O-O') {
    return 'Şahı güvenceye alıp kaleyi açık veya yarı-açık merkezi hatlara bağlar.';
  }
  if (san.includes('x')) {
    return 'Taş alarak materyal dengesini korur veya taktik üstünlük kurar.';
  }
  if (san.startsWith('N')) {
    return 'Atı merkezi karelere yönlendirerek taş hareketliliğini ve kare kontrolünü artırır.';
  }
  if (san.startsWith('B')) {
    return 'Fili aktif çaprazlara yerleştirerek tahta kontrolünü ve merkez baskısını artırır.';
  }
  if (san.startsWith('R')) {
    return 'Kaleyi açık veya yarı açık dikey hatlara getirerek merkez baskısını güçlendirir.';
  }
  if (san.startsWith('Q')) {
    return 'Veziri aktif konuma getirerek hafif taşlarla koordinasyonu pekiştirir.';
  }
  if (san.startsWith('K')) {
    return 'Şahı güvenli kareye aktararak taktik riskleri azaltır.';
  }
  if (/^[a-h]/.test(san)) {
    return 'Merkez ve alan kontrolünü pekiştirerek hafif taşların önünü açar.';
  }
  return 'Taş koordinasyonunu sağlayarak stratejik hatları denetim altına alır.';
}

// Search opening node by SAN move list, powered by both curated TREE_NODES and 3,820 ECO Master Database
export function getOpeningAnalysis(moves: string[]): MoveAnalysis {
  const key = moves.join(' ');
  const node = TREE_NODES[key];

  const side: 'white' | 'black' = moves.length % 2 === 0 ? 'white' : 'black';
  const lastMoveSan = moves.length > 0 ? moves[moves.length - 1] : '';
  const moveNumber = Math.floor((moves.length - 1) / 2) + 1;
  const isWhite = (moves.length - 1) % 2 === 0;

  // Query 3,820 Lichess / ECO official database
  const ecoMatch = findOpeningByMoves(moves);
  let theoreticalCandidates: CandidateMove[] = [];
  let legalMoves: ReturnType<Chess['moves']> = [];
  try {
    const testChess = new Chess();
    for (const m of moves) {
      testChess.move(m);
    }
    legalMoves = testChess.moves({ verbose: true });
    theoreticalCandidates = getTheoreticalContinuations(moves, testChess);
  } catch {}

  // 1. Direct hit in curated Decision Tree
  if (node) {
    const candidates = legalMoves.length === 1
      ? []
      : node.candidates
        .filter((candidate) => legalMoves.some((move) =>
          move.san === candidate.san || (move.from === candidate.from && move.to === candidate.to)))
        .slice(0, MAX_CANDIDATE_CHOICES)
        .map((c) => ({
          ...c,
          futureAttack: getFutureAttackForCandidate(c),
          color: getCandidateColor(c)
        }));

    // Merge any additional variations from the 3,820 database
    for (const tc of theoreticalCandidates) {
      if (candidates.length >= MAX_CANDIDATE_CHOICES) break;
      if (!candidates.some(c => c.san === tc.san)) {
        candidates.push({
          ...tc,
          futureAttack: getFutureAttackForCandidate(tc),
          color: tc.color || getCandidateColor(tc)
        });
      }
    }

    return {
      san: lastMoveSan,
      side,
      openingName: node.openingName,
      eco: node.eco,
      title: node.title,
      whyThisMove: node.whyThisMove,
      whatItProtects: node.whatItProtects,
      whatItThreatens: node.whatItThreatens,
      futurePlan: node.futurePlan,
      coachTip: node.coachTip,
      candidateMoves: candidates
    };
  }

  // 2. Query 3,820 official ECO database (covers all 3,820 variations A00-E99)
  if (ecoMatch || theoreticalCandidates.length > 0) {
    const openingTitle = ecoMatch?.name || 'Teorik Büyükusta Açılışı';
    const ecoCode = ecoMatch?.eco || 'A00';
    return {
      san: lastMoveSan,
      side,
      openingName: openingTitle,
      eco: ecoCode,
      title: `${moveNumber}. ${isWhite ? '' : '..'}${lastMoveSan} - ${openingTitle}`,
      whyThisMove: `${openingTitle} ana varyantı. Merkez hakimiyeti, taş uyumu ve alan kontrolü hedeflenir.`,
      whatItProtects: 'Kritik merkez hatlarını ve taş gelişim koordinasyonunu destekler.',
      whatItThreatens: 'Rakip konuma stratejik ve taktik baskı kurar.',
      futurePlan: 'Merkezi hafif taşlarla kontrol edin, şahınızı rok ile emniyete alın ve açık hatları değerlendirin.',
      coachTip: 'Merkez hakimiyetini ve taş uyumunu koruyun. Şahınızı güvene aldıktan sonra açık hatlardan karşı inisiyatif kurun.',
      candidateMoves: theoreticalCandidates.slice(0, MAX_CANDIDATE_CHOICES)
    };
  }

  // 3. Fallback for completely custom / deep positions
  return {
    san: lastMoveSan,
    side,
    openingName: 'Açılış & Oyun Ortası Geçişi',
    eco: 'Teori Dışı / Serbest',
    title: `${moveNumber}. ${isWhite ? '' : '..'}${lastMoveSan} Hamlesi`,
    whyThisMove: 'Taş koordinasyonu, alan kontrolü ve zayıf karelere baskı amaçlanıyor.',
    whatItProtects: 'Dost taşları ve kritik merkez hatlarını destekler.',
    whatItThreatens: 'Taktik fırsatlar ve alan üstünlüğü arar.',
    futurePlan: 'Açık hatları kalelerle ele geçirin, taşlarınızı rakip zayıflıklara yönlendirin ve şah güvenliğini sağlayın.',
    coachTip: 'Konum teori hamlelerinin ötesine geçti. Hafif taşlarınızı merkeze yönlendirin, açık hatları kalelerle tutun ve taktik çatal/açmaz fırsatlarını kollayın.',
    candidateMoves: []
  };
}

// Helper to get previous decision point candidates
export function getPreviousCandidates(moves: string[]): { prefix: string[]; candidates: CandidateMove[]; playedSan: string } | null {
  if (moves.length === 0) return null;
  const prefix = moves.slice(0, -1);
  const playedSan = moves[moves.length - 1];
  const prevAnalysis = getOpeningAnalysis(prefix);
  return {
    prefix,
    candidates: prevAnalysis.candidateMoves,
    playedSan
  };
}
