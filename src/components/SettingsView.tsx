import React, { useState } from 'react';
import { geminiCoachService } from '../services/geminiCoachService';
import { soundManager } from '../utils/sound';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Shield,
  Save,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Settings as SettingsIcon,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  // Gemini API Key State
  const [geminiKey, setGeminiKey] = useState<string>(() => geminiCoachService.getApiKey());
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [geminiSaved, setGeminiSaved] = useState<boolean>(false);

  // Lichess Token State
  const [lichessToken, setLichessToken] = useState<string>(
    () => localStorage.getItem('satranc_lichess_token') || ''
  );
  const [lichessSaved, setLichessSaved] = useState<boolean>(false);

  // Sound State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundManager.isEnabled());

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    geminiCoachService.setApiKey(geminiKey);
    setGeminiSaved(true);
    setTimeout(() => setGeminiSaved(false), 2500);
  };

  const handleRemoveGeminiKey = () => {
    geminiCoachService.setApiKey('');
    setGeminiKey('');
    setGeminiSaved(true);
    setTimeout(() => setGeminiSaved(false), 2500);
  };

  const handleSaveLichessToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (lichessToken.trim()) {
      localStorage.setItem('satranc_lichess_token', lichessToken.trim());
    } else {
      localStorage.removeItem('satranc_lichess_token');
    }
    setLichessSaved(true);
    setTimeout(() => setLichessSaved(false), 2500);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setEnabled(next);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-amber-400">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Uygulama Ayarları</h1>
          <p className="text-xs text-slate-400">Yapay Zeka (Gemini), veri kaynakları ve tahta tercihleri</p>
        </div>
      </div>

      {/* Gemini AI Key Section */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Google Gemini AI Büyükusta Entegrasyonu</h2>
          </div>
          {geminiCoachService.hasApiKey() && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Aktif
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Google Gemini API anahtarınızı tanımlayarak Satranç Hocası'na canlı büyükusta zekası kazandırabilirsiniz.
          Her hamleden sonra tahtadaki taktikleri, rakibin niyetini ve gizli planları size bir usta gibi açıklar.
          Anahtarınız yalnızca tarayıcınızın yerel hafızasında (localStorage) güvenle saklanır.
        </p>

        <form onSubmit={handleSaveGeminiKey} className="mt-4 flex flex-col gap-3">
          <div className="relative">
            <input
              type={showGeminiKey ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              {showGeminiKey ? 'Gizle' : 'Göster'}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:underline"
            >
              <span>Ücretsiz Google Gemini API Anahtarı Al</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <div className="flex gap-2">
              {geminiCoachService.hasApiKey() && (
                <button
                  type="button"
                  onClick={handleRemoveGeminiKey}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Kaldır</span>
                </button>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{geminiSaved ? 'Kaydedildi!' : 'Kaydet'}</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Lichess Masters Explorer Token Section */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Lichess Masters API Token (İsteğe Bağlı)</h2>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Uygulama zaten 3.820 adet yerel açılış veritabanına sahiptir. Çevrimiçi Lichess büyükusta istatistiklerine
          daha yüksek kota ile erişmek isterseniz kişisel Lichess erişim jetonunuzu girebilirsiniz.
        </p>

        <form onSubmit={handleSaveLichessToken} className="mt-4 flex flex-col gap-3">
          <input
            type="password"
            value={lichessToken}
            onChange={(e) => setLichessToken(e.target.value)}
            placeholder="lip_..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              href="https://lichess.org/account/oauth/token"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:underline"
            >
              <span>Lichess Token Oluştur</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{lichessSaved ? 'Kaydedildi!' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Preferences Section */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <h2 className="text-base font-bold text-white mb-3">Ses ve Tercihler</h2>
        <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
          <div>
            <span className="text-xs font-bold text-slate-200">Tahta Ses Efektleri</span>
            <p className="text-[11px] text-slate-500">Hamle, taş alma ve şah çekme seslerini açar/kapatır.</p>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
              soundEnabled
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{soundEnabled ? 'Açık' : 'Kapalı'}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
