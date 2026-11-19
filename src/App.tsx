import { useState } from 'react';
import './App.css';
import { Navbar, type TabType } from './components/Navbar';
import { TeacherWorkspace } from './components/TeacherWorkspace';
import { FreeBoard } from './components/FreeBoard';
import { AcademyView } from './components/AcademyView';
import { PuzzlesView } from './components/PuzzlesView';
import { SettingsView } from './components/SettingsView';

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('coach');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main Content Area */}
      <main className="app-main flex-1 flex flex-col justify-start">
        <ErrorBoundary>
          {currentTab === 'coach' && <TeacherWorkspace />}
          {currentTab === 'free' && <FreeBoard />}
          {currentTab === 'academy' && <AcademyView />}
          {currentTab === 'puzzles' && <PuzzlesView />}
          {currentTab === 'settings' && <SettingsView />}
        </ErrorBoundary>
      </main>

      <footer className="border-t border-slate-800 px-4 py-3 text-center text-xs text-slate-500">
        Satranç Akademisi
      </footer>
    </div>
  );
}
