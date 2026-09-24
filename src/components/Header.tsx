/**
 * Top Navigation Bar conforming to the 3-zone Top Bar Contract
 */

import React from 'react';
import { Share2, FileCode, Sliders, BookOpen } from 'lucide-react';

interface HeaderProps {
  onOpenExport: () => void;
  activeTab: 'builder' | 'theory';
  setActiveTab: (tab: 'builder' | 'theory') => void;
  mode: 'basic' | 'advanced';
  setMode: (mode: 'basic' | 'advanced') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenExport,
  activeTab,
  setActiveTab,
  mode,
  setMode,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-[#07090e] shrink-0">
      {/* Zone 1: Single Brand Wordmark */}
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400/60 transition-colors">
            <span className="font-display font-bold text-base tracking-tighter">A</span>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            MOLMATRIX
          </span>
        </a>
        <span className="hidden sm:inline text-xs text-slate-500 font-mono">
          · {mode === 'basic' ? 'BASIC ADJACENCY' : 'ADVANCED NORMALIZER'}
        </span>
      </div>

      {/* Zone 2: Navigation & Mode Toggle */}
      <div className="flex items-center gap-4">
        {/* Basic vs Advanced mode switcher */}
        <div className="flex items-center p-0.5 bg-[#101422] border border-slate-700/80 rounded-lg text-xs font-mono">
          <button
            onClick={() => setMode('basic')}
            className={`px-3 py-1 rounded transition-all ${
              mode === 'basic'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Basic Connections
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={`px-3 py-1 rounded transition-all ${
              mode === 'advanced'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Advanced Normalizations
          </button>
        </div>

        <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400 border-l border-slate-800 pl-4">
          <button
            onClick={() => setActiveTab('builder')}
            className={`transition-colors flex items-center gap-1.5 py-1 ${
              activeTab === 'builder'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Matrix Builder</span>
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`transition-colors flex items-center gap-1.5 py-1 ${
              activeTab === 'theory'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Theory & Math</span>
          </button>
        </nav>
      </div>

      {/* Zone 3: 1-2 Primary Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-medium text-slate-200 bg-slate-900 border border-slate-700/80 rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-colors whitespace-nowrap"
          title="Export Matrix (CSV, LaTeX, NumPy, MATLAB, JSON)"
        >
          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export Matrix</span>
        </button>
      </div>
    </header>
  );
};
