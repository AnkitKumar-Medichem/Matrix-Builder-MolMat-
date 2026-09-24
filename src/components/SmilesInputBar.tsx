/**
 * SMILES Input Bar with validation, presets picker, and molecular metadata
 */

import React, { useState } from 'react';
import { MoleculePreset, PRESETS } from '../utils/presets';
import { MoleculeGraph } from '../types/chem';
import { Sparkles, CheckCircle2, AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react';

interface SmilesInputBarProps {
  smiles: string;
  setSmiles: (val: string) => void;
  graph: MoleculeGraph | null;
  error: string | null;
  onSelectPreset: (preset: MoleculePreset) => void;
  includeHydrogens: boolean;
  setIncludeHydrogens: (val: boolean) => void;
}

export const SmilesInputBar: React.FC<SmilesInputBarProps> = ({
  smiles,
  setSmiles,
  graph,
  error,
  onSelectPreset,
  includeHydrogens,
  setIncludeHydrogens,
}) => {
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Pharmaceuticals', 'Aromatics & Rings', 'Biomolecules', 'Common Organics'];

  const filteredPresets = selectedCategory === 'All'
    ? PRESETS
    : PRESETS.filter((p) => p.category === selectedCategory);

  return (
    <div className="bg-[#0e131f] border-b border-slate-800/80 px-6 py-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* SMILES Input Group */}
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={smiles}
              onChange={(e) => setSmiles(e.target.value)}
              placeholder="Enter SMILES string (e.g. CC(=O)Oc1ccccc1C(=O)O or c1ccccc1)"
              className="w-full bg-[#07090e] border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-colors"
              spellCheck={false}
            />
            {smiles && (
              <button
                onClick={() => setSmiles('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-mono"
                title="Clear input"
              >
                Clear
              </button>
            )}
          </div>

          {/* Preset Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsPresetsOpen(!isPresetsOpen)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium text-slate-300 bg-[#141b2d] border border-slate-700 rounded-lg hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap"
            >
              <span>Library Presets</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isPresetsOpen && (
              <div
                className="absolute left-0 mt-1.5 w-80 max-h-96 overflow-y-auto bg-[#0b0f19] border border-slate-700 rounded-lg shadow-2xl z-50 p-2"
                onMouseLeave={() => setIsPresetsOpen(false)}
              >
                {/* Category filter tabs */}
                <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-slate-800 text-[11px]">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        selectedCategory === cat
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  {filteredPresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectPreset(preset);
                        setIsPresetsOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800/70 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-200 group-hover:text-cyan-300">
                          {preset.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {preset.formulaName}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        {preset.smiles}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hydrogens Toggle */}
          <button
            onClick={() => setIncludeHydrogens(!includeHydrogens)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-lg border transition-colors whitespace-nowrap ${
              includeHydrogens
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                : 'bg-[#141b2d] border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle between hydrogen-depleted (heavy atom graph) and explicit hydrogens graph"
          >
            <span>Explicit H:</span>
            <span className="font-semibold">{includeHydrogens ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Status and Molecular Properties */}
        <div className="flex items-center gap-4 text-xs font-mono shrink-0">
          {error ? (
            <div className="flex items-center gap-1.5 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-xs">{error}</span>
            </div>
          ) : graph ? (
            <div className="flex items-center gap-3 text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>VALID</span>
              </div>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span className="text-slate-200 font-semibold">{graph.canonicalFormula}</span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span>{graph.molecularWeight.toFixed(2)} Da</span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span>{graph.atoms.length} Atoms</span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span>{graph.bonds.length} Bonds</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
