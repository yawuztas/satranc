/**
 * Gemini AI Chess Grandmaster Coach Service
 * Connects to Google Gemini API for deep, personalized, human-like Grandmaster coaching.
 * Falls back transparently to local engines if key is missing or offline.
 */

export interface GeminiAnalysisResult {
  coachTip: string;
  opponentIntent?: string;
  trapWarning?: string;
  threeStepMission?: string[];
  championParallel?: string;
  rawText?: string;
}

const STORAGE_KEY = 'satranc_gemini_api_key';
const ACTIVE_MODEL_KEY = 'satranc_gemini_active_model';

/**
 * Clean and sanitize user-provided API keys (strips quotes, prefixes, whitespaces)
 */
export function cleanApiKey(key: string): string {
  if (!key) return '';
  let cleaned = key.trim();
  // Strip surrounding quotes
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
  // Strip common env prefixes like GEMINI_API_KEY= or API_KEY= or Bearer
  cleaned = cleaned.replace(/^(GEMINI_API_KEY|GOOGLE_API_KEY|API_KEY|Bearer)\s*[:=]?\s*/i, '');
  // Strip trailing punctuation
  cleaned = cleaned.replace(/[;,]+$/, '').trim();
  return cleaned;
}

export const geminiCoachService = {
  getApiKey(): string {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return cleanApiKey(stored);
    return '';
  },

  setApiKey(key: string): void {
    const cleaned = cleanApiKey(key);
    if (cleaned) {
      localStorage.setItem(STORAGE_KEY, cleaned);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACTIVE_MODEL_KEY);
    }
  },

  hasApiKey(): boolean {
    return Boolean(this.getApiKey());
  },

  getActiveModel(): string {
    return localStorage.getItem(ACTIVE_MODEL_KEY) || 'gemini-3.7-flash';
  },

  setActiveModel(model: string): void {
    if (model) {
      localStorage.setItem(ACTIVE_MODEL_KEY, model);
    }
  },

  /**
   * Helper that executes generateContent trying the active model first,
   * then gracefully cascading through supported Gemini models.
   */
  async generateContentWithFallback(
    payload: {
      systemInstruction?: { parts: { text: string }[] };
      contents: { parts: { text: string }[] }[];
      generationConfig?: Record<string, any>;
    },
    providedKey?: string
  ): Promise<{ text: string; modelUsed: string } | null> {
    const apiKey = cleanApiKey(providedKey || this.getApiKey());
    if (!apiKey) return null;

    const preferred = this.getActiveModel();
    const candidateModels = [
      preferred,
      'gemini-3.7-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-2.5-flash-lite',
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    for (const model of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            this.setActiveModel(model);
            return { text, modelUsed: model };
          }
        } else {
          const errData = await response.json().catch(() => null);
          console.warn(`Gemini ${model} request returned HTTP ${response.status}:`, errData?.error?.message || response.statusText);
        }
      } catch (err) {
        console.warn(`Gemini fetch error with model ${model}:`, err);
      }
    }

    return null;
  },

  /**
   * Request deep Grandmaster analysis from Gemini for the current move & position
   */
  async analyzePosition(params: {
    fen: string;
    moveHistory: string[];
    lastMoveSan?: string;
    lastMoveColor?: 'white' | 'black';
    playerColor: 'white' | 'black';
    level: 'beginner' | 'intermediate' | 'advanced';
    openingName?: string;
    eco?: string;
    stockfishEval?: { score: number; bestMoveSan?: string; pvSans?: string[] };
    pvTheme?: string;
    immediateThreat?: string;
    tacticalFeatures?: string[];
  }): Promise<GeminiAnalysisResult | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const levelDescriptions = {
      beginner: 'Başlangıç seviyesinde bir satranç öğrencisi. Anlaşılır, somut, motive edici ve temel prensiplere dayalı konuş.',
      intermediate: 'Orta seviye kulüp oyuncusu. Açık hatlar, piyon zincirleri, zayıf kareler ve taktik motiflere odaklan.',
      advanced: 'İleri düzey turnuva oyuncusu. Dinamik dengesizlikler, inisiyatif ve profilaksi üzerinde dur.'
    };

    const isPlayerLastMove = params.lastMoveColor === params.playerColor;
    const actor = isPlayerLastMove ? 'Öğrenci (Sen)' : 'Rakip';

    const systemPrompt = `Sen dünyanın en iyi Satranç Başantrenörüsün (Grandmaster Coach).
Görevin, Türk bir satranç öğrencisini canlı olarak eğitmek.
Öğrencinin seviyesi: ${params.level} (${levelDescriptions[params.level]}).
Öğrencinin rengi: ${params.playerColor === 'white' ? 'Beyaz' : 'Siyah'}.
YANITINI SADECE AŞAĞIDAKİ GEÇERLİ JSON FORMATINDA VER (Markdown kod bloğu olmadan veya \`\`\`json içinde):
{
  "opponentIntent": "Rakibin bu hamledeki gizli zihni ve amacı (1-2 vurucu cümle)",
  "trapWarning": "Bu konumda amatörlerin en çok düştüğü tipik tuzak ve hata uyarısı (1-2 cümle)",
  "threeStepMission": ["1. Adım: ...", "2. Adım: ...", "3. Adım: ..."],
  "championParallel": "Tarihteki efsane dünya şampiyonlarından (Kasparov, Carlsen, Fischer vb.) bu konuma benzer ilham verici tarihi bir maç veya fikir (1 cümle)",
  "coachTip": "Senin bir başantrenör olarak öğrenciye bu andaki en önemli altın kuralın ve tavsiyen (2 cümle)"
}`;

    const userPrompt = `Konum FEN: ${params.fen}
Açılış: ${params.openingName || 'Bilinmiyor'} (ECO: ${params.eco || '—'})
Hamleler: ${params.moveHistory.length > 0 ? params.moveHistory.join(' ') : 'Başlangıç'}
Son Hamle: ${params.lastMoveSan ? `${actor} "${params.lastMoveSan}" oynadı.` : 'Başlangıç'}
Stockfish Değerlendirmesi: ${params.stockfishEval ? `${(params.stockfishEval.score / 100).toFixed(1)} cp` : 'Eşit'}
Stockfish En İyi Karşı Hamle: ${params.stockfishEval?.bestMoveSan || 'Hesaplanıyor'}
Stockfish Rota: ${params.stockfishEval?.pvSans ? params.stockfishEval.pvSans.slice(0, 6).join(' -> ') : 'Hesaplanıyor'}
Rakibin Somut Tehdidi (Null-Move Motoru): ${params.immediateThreat || 'Doğrudan tek hamlelik taktik tehdit yok, konumsal gelişim'}
Tahta Taktik Durumu (Açmazlar, Boştaki Taşlar, Çatallar): ${params.tacticalFeatures && params.tacticalFeatures.length > 0 ? params.tacticalFeatures.join(' | ') : 'Taktik kriz yok, dengeli'}

Lütfen yukarıdaki matematiksel verilere kesinlikle sadık kalarak JSON formatında analizi hazırla.`;

    try {
      const res = await this.generateContentWithFallback({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200,
          responseMimeType: 'application/json',
        },
      });

      if (!res?.text) return null;
      const rawText = res.text;

      // Clean JSON if enclosed in markdown
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      try {
        const parsed = JSON.parse(cleanJson);
        return {
          coachTip: parsed.coachTip || 'Taş koordinasyonunu ve merkez kontrolünü sağlayın.',
          opponentIntent: parsed.opponentIntent || '',
          trapWarning: parsed.trapWarning || '',
          threeStepMission: Array.isArray(parsed.threeStepMission) ? parsed.threeStepMission : undefined,
          championParallel: parsed.championParallel || '',
          rawText,
        };
      } catch {
        // Never leak raw/truncated JSON syntax into the UI
        const tipMatch = cleanJson.match(/"coachTip"\s*:\s*"([^"]+)"/);
        const intentMatch = cleanJson.match(/"opponentIntent"\s*:\s*"([^"]+)"/);
        const extractedTip = tipMatch?.[1] || intentMatch?.[1];
        if (!extractedTip && cleanJson.trim().startsWith('{')) {
          return null;
        }
        return {
          coachTip: extractedTip || rawText,
          opponentIntent: intentMatch?.[1] || '',
          trapWarning: '',
          rawText,
        };
      }
    } catch (err) {
      console.warn('Gemini Coach fetch failed, falling back to local engine:', err);
      return null;
    }
  },

  /**
   * Ask the Grandmaster coach any custom question regarding current board
   */
  async askQuestion(params: {
    question: string;
    fen: string;
    moveHistory: string[];
    playerColor: 'white' | 'black';
    level: 'beginner' | 'intermediate' | 'advanced';
    openingName?: string;
  }): Promise<string | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const systemPrompt = `Sen bir Satranç Başantrenörüsün. Öğrencin tahtadaki konumla ilgili bir soru soruyor.
Konum FEN: ${params.fen}
Açılış: ${params.openingName || 'Konum'}
Hamleler: ${params.moveHistory.join(' ')}
Öğrencinin rengi: ${params.playerColor === 'white' ? 'Beyaz' : 'Siyah'}
Öğrencinin seviyesi: ${params.level}

Öğrencinin sorusuna doğrudan, eğitici, tahtadaki somut kareler ve taşlar üzerinden yanıt ver.`;

    try {
      const res = await this.generateContentWithFallback({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: params.question }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
        },
      });

      return res?.text || null;
    } catch {
      return null;
    }
  },

  /**
   * Validate & test Gemini API Key connection.
   * Auto-detects supported model directly from the user's Google account!
   */
  async testApiKey(key: string): Promise<{ success: boolean; message: string; model?: string }> {
    const cleaned = cleanApiKey(key);
    if (!cleaned) {
      return { success: false, message: 'Lütfen geçerli bir anahtar girin.' };
    }

    // 1. First attempt: Query available models list from Google API
    try {
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${cleaned}`
      );

      if (listRes.ok) {
        const listData = await listRes.json();
        const availableModels: string[] = (listData.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace(/^models\//, ''));

        // Pick best model: prefer gemini-3.7-flash, then 3.5-flash-lite, 3.8-flash, etc.
        const bestModel =
          availableModels.find((m) => m === 'gemini-3.7-flash') ||
          availableModels.find((m) => m === 'gemini-3.5-flash-lite') ||
          availableModels.find((m) => m === 'gemini-3.8-flash') ||
          availableModels.find((m) => m === 'gemini-flash-latest') ||
          availableModels.find((m) => m === 'gemini-3.5-flash') ||
          availableModels.find((m) => m.includes('flash')) ||
          availableModels.find((m) => m.includes('pro')) ||
          availableModels[0];

        if (bestModel) {
          // Perform test generation with this exact model
          const testGen = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${bestModel}:generateContent?key=${cleaned}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Satranç şahı nasıl hareket eder? Tek kısa cümleyle yanıtla.' }] }],
              }),
            }
          );

          if (testGen.ok) {
            this.setApiKey(cleaned);
            this.setActiveModel(bestModel);
            return {
              success: true,
              model: bestModel,
              message: `✅ Gemini AI (${bestModel}) bağlantısı başarılı! Başantrenörünüz aktif hale geldi.`,
            };
          }
        }
      } else {
        const errJson = await listRes.json().catch(() => null);
        const errMsg = errJson?.error?.message;
        if (listRes.status === 400 || errMsg?.includes('API key not valid')) {
          return {
            success: false,
            message: `❌ API Anahtarı Geçersiz (HTTP ${listRes.status}): Google, anahtarın geçerli olmadığını bildirdi. Lütfen Google AI Studio (aistudio.google.com) üzerinden oluşturduğunuz anahtarı kontrol edin.`,
          };
        }
        if (listRes.status === 403) {
          return {
            success: false,
            message: `❌ Yetkilendirme Hatası (HTTP 403): ${errMsg || 'Bu API anahtarının Gemini API kullanım izni yok veya kısıtlanmış.'}`,
          };
        }
      }
    } catch {
      // Network failure on listing, proceed to direct fallback
    }

    // 2. Direct Fallback: Try candidate models in order with actual test generation
    const candidateModels = [
      'gemini-3.7-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-2.5-flash-lite',
    ];
    let lastErrorDetail = '';
    let lastHttpStatus = 0;

    for (const model of candidateModels) {
      try {
        const testRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleaned}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Satranç şahı nasıl hareket eder? Tek kısa cümleyle yanıtla.' }] }],
            }),
          }
        );

        if (testRes.ok) {
          this.setApiKey(cleaned);
          this.setActiveModel(model);
          return {
            success: true,
            model,
            message: `✅ Gemini AI (${model}) bağlantısı başarılı! Başantrenörünüz aktif hale geldi.`,
          };
        } else {
          lastHttpStatus = testRes.status;
          const errData = await testRes.json().catch(() => null);
          lastErrorDetail = errData?.error?.message || testRes.statusText;
        }
      } catch (err: any) {
        lastErrorDetail = err?.message || 'Ağ bağlantı hatası';
      }
    }

    return {
      success: false,
      message: `❌ Bağlantı Başarısız (HTTP ${lastHttpStatus || 'Hata'}): ${lastErrorDetail || 'Google API anahtarını doğrulayamadı. Lütfen Google AI Studio hesabınızı kontrol edin.'}`,
    };
  },

  /**
   * Generates a smart offline Grandmaster answer when user has no Gemini key
   */
  generateOfflineCoachAnswer(params: {
    question: string;
    fen: string;
    openingName?: string;
    coachTip?: string;
    bestMoveSan?: string;
    whyThisMove?: string;
    threat?: string;
    futurePlan?: string;
  }): string {
    const q = params.question.toLowerCase();
    let topic = 'Konumsal İnceleme';
    let detail = '';

    if (q.includes('tehdit') || q.includes('saldır') || q.includes('ne istiyor') || q.includes('tehlike')) {
      topic = 'Rakibin Tehdidi & Saldırı Planı';
      detail = params.threat
        ? `Rakibin ana tehdidi: ${params.threat}. ${params.coachTip || ''}`
        : `Rakip hafif taşlarını etkin karelere aktarıp merkez ve zayıf karelere sızmayı amaçlıyor.`;
    } else if (q.includes('en iyi') || q.includes('ne oyna') || q.includes('hamle') || q.includes('tavsiye')) {
      topic = 'Tavsiye Edilen En İyi Hamle';
      detail = params.bestMoveSan
        ? `Bu konumda büyükustaların ve motorun önerdiği en güçlü hamle "${params.bestMoveSan}" hamlesidir. ${params.whyThisMove || ''}`
        : `${params.coachTip || 'Merkeze hakim olun, taşlarınızı ahenkle geliştirin.'}`;
    } else if (q.includes('plan') || q.includes('nereye') || q.includes('sonra') || q.includes('hedef')) {
      topic = 'Stratejik Gelecek Planı';
      detail = params.futurePlan || params.coachTip || 'Şahınızı rok ile emniyete aldıktan sonra merkez veya kanat piyon yarmaları hazırlayın.';
    } else if (q.includes('piyon') || q.includes('feda') || q.includes('gambit')) {
      topic = 'Piyon Yapısı ve Gambit Felsefesi';
      detail = `Satrançta piyon fedaları hat açmak ve gelişim üstünlüğü sağlamak içindir. Konumdaki açılış: ${params.openingName || 'Açık Oyun'}. ${params.coachTip || ''}`;
    } else {
      topic = 'Büyükustanın Değerlendirmesi';
      detail = `${params.coachTip || ''} Açılış: ${params.openingName || 'Açık Oyun'}. En önemli önceliğiniz şah güvenliği ve merkez kontrolüdür.`;
    }

    return `🏛️ [Yerel Satranç Hocası - ${topic}]:\n${detail}\n\n💡 (Not: İstediğiniz her soruya canlı yapay zeka ile anında yanıt almak için sağ üstteki "Gemini Anahtarı Ekle" butonuna tıklayarak tamamen ücretsiz bir API anahtarı ekleyebilirsiniz.)`;
  },

  /**
   * Generates offline Grandmaster analysis cards when Gemini key is not set
   */
  generateOfflineAnalysis(params: {
    lastMoveSan?: string;
    lastMoveActor?: 'player' | 'opponent' | null;
    openingName?: string;
    whyThisMove?: string;
    futurePlan?: string;
    bestMoveSan?: string;
    championParallel?: string;
    immediateThreat?: string;
    tacticalFeatures?: string[];
  }): GeminiAnalysisResult {
    const oppIntent = params.immediateThreat || (params.lastMoveSan
      ? `Rakip "${params.lastMoveSan}" hamlesiyle merkez ve kanat hatlarında inisiyatif kurmayı ve zayıf kareleri zorlamayı amaçlıyor.`
      : 'Rakip merkez karelerin (e4, d4, e5, d5) kontrolünü ele geçirip taş gelişim üstünlüğü arıyor.');

    const trapWarning = params.tacticalFeatures && params.tacticalFeatures.length > 0
      ? params.tacticalFeatures.join(' ')
      : 'Açılışta aynı taşla zorunlu olmadıkça iki kez oynamaktan ve şahınızı merkezde açıkta bırakmaktan kaçının.';

    return {
      coachTip: params.futurePlan || (params.bestMoveSan ? `En iyi yanıt "${params.bestMoveSan}" ile merkezi sağlamlaştırmak.` : 'Hafif taşlarınızı merkeze aktarın, şahınızı rok ile emniyete alın.'),
      opponentIntent: oppIntent,
      trapWarning,
      threeStepMission: [
        '1. Adım: Hafif taşları (At ve Fil) merkez karelere geliştirin.',
        '2. Adım: Şahınızı kısa rok atarak güvenli limana çekin.',
        '3. Adım: Açık veya yarı açık dikey hatlara kalelerinizi yerleştirin.'
      ],
      championParallel: params.championParallel || 'Garry Kasparov ve Magnus Carlsen bu gibi açılışlarda taş koordinasyonu ve merkez dominasyonuna en yüksek önceliği verir.',
    };
  },
};
