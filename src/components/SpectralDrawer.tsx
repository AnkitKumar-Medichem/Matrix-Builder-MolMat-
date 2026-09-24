/**
 * Spectral Graph Theory & Topological Indices Analysis Panel
 */

import React from 'react';
import { MatrixResult } from '../types/chem';
import { Activity, BarChart2, Hash, GitCommit } from 'lucide-react';

interface SpectralDrawerProps {
  matrixResult: MatrixResult;
}

export const SpectralDrawer: React.FC<SpectralDrawerProps> = ({ matrixResult }) => {
  const {
    dim,
    trace,
    density,
    sparsity,
    frobeniusNorm,
    eigenvalues,
    spectralRadius,
    spectralGap,
    algebraicConnectivity,
    wienerIndex,
    randicIndex,
    firstZagrebIndex,
    secondZagrebIndex,
  } = matrixResult;

  const maxEigen = eigenvalues.length > 0 ? Math.max(...eigenvalues.map((v) => Math.abs(v))) : 1;

  return (
    <div className="bg-[#0b0e17] border-t border-slate-800/80 p-6 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Spectral Graph Analysis & Topological Descriptors
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-500">
          N = {dim} atoms · λ_max = {spectralRadius.toFixed(3)}
        </span>
      </div>

      {/* Grid of Key Numerical Descriptors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#111726] border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">Trace Tr(A)</span>
          <span className="text-lg font-mono font-bold text-white tabular-nums">
            {trace.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Sum of eigenvalues</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">Spectral Radius ρ</span>
          <span className="text-lg font-mono font-bold text-cyan-300 tabular-nums">
            {spectralRadius.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">max |λ_i|</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">Spectral Gap</span>
          <span className="text-lg font-mono font-bold text-slate-200 tabular-nums">
            {(spectralGap ?? 0).toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">λ_1 - λ_2</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">Wiener Index W</span>
          <span className="text-lg font-mono font-bold text-amber-300 tabular-nums">
            {wienerIndex}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">1/2 Σ d(i,j)</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">Randić Index χ</span>
          <span className="text-lg font-mono font-bold text-emerald-300 tabular-nums">
            {randicIndex.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Branching index</span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-lg p-3">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">
            {algebraicConnectivity !== undefined ? 'Algebraic Conn. λ_2' : 'Frobenius Norm'}
          </span>
          <span className="text-lg font-mono font-bold text-violet-300 tabular-nums">
            {algebraicConnectivity !== undefined
              ? algebraicConnectivity.toFixed(3)
              : frobeniusNorm.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {algebraicConnectivity !== undefined ? 'Fiedler eigenvalue' : '||A||_F'}
          </span>
        </div>
      </div>

      {/* Eigenvalue Spectrum Bar Visualization */}
      <div className="bg-[#0f1422] border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
              Eigenvalue Spectrum (λ_1 to λ_{eigenvalues.length})
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Density: {density.toFixed(1)}% · Sparsity: {sparsity.toFixed(1)}% · M1: {firstZagrebIndex} · M2: {secondZagrebIndex}
          </span>
        </div>

        {eigenvalues.length > 0 ? (
          <div className="flex items-end gap-1.5 h-28 pt-4 pb-2 px-2 overflow-x-auto">
            {eigenvalues.map((ev, idx) => {
              const heightPercent = maxEigen > 0 ? (Math.abs(ev) / maxEigen) * 100 : 0;
              const isPositive = ev >= 0;

              return (
                <div
                  key={`ev-${idx}`}
                  className="flex-1 min-w-[24px] max-w-[48px] flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 border border-slate-700 text-cyan-300 px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap z-20 shadow-lg">
                    λ_{idx + 1} = {ev.toFixed(4)}
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${Math.max(4, heightPercent)}%` }}
                    className={`w-full rounded-t transition-all ${
                      isPositive
                        ? 'bg-cyan-500/70 group-hover:bg-cyan-400'
                        : 'bg-rose-500/70 group-hover:bg-rose-400'
                    }`}
                  />

                  {/* Subscript Label */}
                  <span className="text-[9px] font-mono text-slate-500 mt-1">
                    {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-500 py-6 text-center">
            No eigenvalues computed
          </div>
        )}
      </div>
    </div>
  );
};
