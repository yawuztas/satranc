# ♟️ Satranc Akademisi — Chess Academy

An interactive, local-first chess training app in Turkish: learn openings,
practice tactics, analyze with Stockfish, and get human-like coaching from
Google Gemini — all in the browser, with no backend required.

> **Türkçe özet için aşağı kaydırın** / *Scroll down for the Turkish summary.*

## ✨ Features

- **♟️ Chess Coach (Satranç Hocası)** — pick your level (beginner/intermediate/
  advanced) and color; the coach suggests candidate moves, compares yours
  against the plan, explains ideas and plays the opponent's reply automatically
- **🤖 AI Grandmaster Coach** — deep, personalized natural-language analysis via
  the Gemini API. Bring your own key (stored in `localStorage`); falls back
  transparently to local engines when offline
- **🔬 Free Board (Serbest Oyun)** — set up any position, explore variants and
  read live engine evaluations with an evaluation bar
- **🧩 Puzzles & Traps (Bulmacalar / Tuzak Antrenörü)** — solve tactical and
  trapping positions
- **📚 Opening Explorer (Açılış Keşifi)** — embedded master-game statistics as
  an always-available local archive, optionally enriched live from the
  [Lichess Masters Explorer](https://lichess.org/api) (works 100% token-free)
- **🎓 Endgame Academy (Son Oyun Akademisi)** — Syzygy 7-piece tablebase probes
- **🎯 Middlegame Coach & Strategy Guide** — plan-based middlegame training and
  strategy tips dataset
- **📖 Blunder Book** — learn from mistakes with annotated analysis
- **🗣️ Speech Coach** — voice move announcements and sound feedback
- **📱 Responsive** — Turkish UI that adapts to mobile and desktop

## 🛠 Tech Stack

| Layer | Tools |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Chess logic | [chess.js](https://github.com/jhlywa/chess.js), [chessops](https://github.com/niklasf/chessops), [chessground](https://github.com/lichess-org/chessground) |
| Engine | Stockfish (WASM, Web Worker) |
| Tablebases | Syzygy 7-piece (Lichess) |
| AI Coach | Google Gemini API (user-provided key) |
| Styling | Tailwind CSS 4 |

## 🚀 Getting Started

```bash
npm install
npm run dev      # local dev server
npm run build    # production build (dist/)
```

**Optional:** open ⚙️ Settings and paste your own
[Google AI Studio](https://aistudio.google.com/) key to enable the AI coach.
Without a key, every module still runs on local engines.

## 📁 Project Structure

```
src/
├── components/   # Chessboard, AcademyView, PuzzlesView, FreeBoard,
│                 # OpeningExplorer, EndgameAcademy, TrapTrainer, ...
├── services/     # stockfishService, lichessService, geminiCoachService,
│                 # blunderBookService, nullMoveService, ...
├── data/         # openingsDatabase, endgameData, trapsData, ...
└── utils/        # boardFeatureExtractor, dynamicCoach, tacticalSafety, ...
scripts/          # opening database generators (Node)
public/stockfish/ # Stockfish WASM builds
```

## 📄 License

All rights reserved. Personal project — see repository settings.

---

## 🇹🇷 Türkçe Özet

**Satranç Akademisi**, açılışlar, taktikler ve oyun planlarını etkileşimli bir
tahtada çalışmak için geliştirilen **yerel öncelikli** bir satranç eğitim
uygulamasıdır. Türkçe arayüz mobil ve masaüstüne uyumludur.

- **♟️ Satranç Hocası:** Seviye ve renk seç, aday hamleleri gör, planla
  karşılaştır; rakibin cevabı otomatik oynanır
- **🤖 AI Büyükusta:** Gemini API ile derin, kişiselleştirilmiş yorum —
  anahtar senin (localStorage'da saklanır); anahtar yoksa yerel motorlara düşer
- **🔬 Serbest Oyun:** Konum kur, varyant incele, motor değerlendirmesi al
- **🧩 Bulmaca & Tuzak Antrenörü:** Taktik/tuzak pozisyonlarında doğru hamleyi bul
- **📚 Açılış Keşifi:** Yerel büyükusta arşivi + isteyen için Lichess Masters
  (token gerekmez, çevrimdışı da çalışır)
- **🎓 Son Oyun Akademisi:** Syzygy 7 taş tabanları ile bitireg çalışması

**Motor:** Stockfish WASM, Web Worker içinde — arayüz asla kilitlenmez.
**Çalıştırma:** `npm install && npm run dev`
