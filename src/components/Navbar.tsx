import React, { useState } from 'react';
import { soundManager } from '../utils/sound';
import {
  Skull,
  Volume2,
  VolumeX,
  Menu,
  X,
  Crown,
  GraduationCap,
  Settings,
  Swords,
  BookOpen
} from 'lucide-react';

export type TabType = 'coach' | 'free' | 'academy' | 'puzzles' | 'settings';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const toggleSound = () => {
    const nextState = !soundOn;
    setSoundOn(nextState);
    soundManager.setEnabled(nextState);
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'coach', label: 'Açılış Okulu & Koç', icon: <GraduationCap className="w-4 h-4 text-amber-400" /> },
    { id: 'free', label: 'Serbest Oyun', icon: <Swords className="w-4 h-4 text-cyan-400" /> },
    { id: 'academy', label: 'Akademi & Strateji', icon: <BookOpen className="w-4 h-4 text-emerald-400" /> },
    { id: 'puzzles', label: 'Tuzaklar & Taktik', icon: <Skull className="w-4 h-4 text-rose-400" /> },
    { id: 'settings', label: 'Ayarlar', icon: <Settings className="w-4 h-4 text-slate-400" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          type="button"
          onClick={() => onTabChange('coach')}
          aria-label="Satranç Akademisi ana sayfa"
          className="flex items-center gap-2.5 cursor-pointer group select-none border-0 bg-transparent p-0 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Crown className="w-6 h-6 text-slate-950 fill-current" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
              Satranç<span className="text-amber-400">Akademisi</span>
            </span>
            <span className="text-[10px] text-slate-400 block -mt-1 font-medium">Açılışlar • Tuzaklar • Strateji</span>
          </div>
        </button>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative ${
                  active
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Sound Toggle & Mobile Menu */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? 'Sesi Kapat' : 'Sesi Aç'}
            aria-pressed={soundOn}
            className={`p-2 rounded-xl border transition-colors ${
              soundOn
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
            }`}
            title={soundOn ? 'Sesi Kapat' : 'Sesi Aç'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Menüyü Kapat' : 'Menüyü Aç'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            className="md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-between ${
                  active
                    ? 'bg-slate-800 text-amber-400 border border-slate-700'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
