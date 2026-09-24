/**
 * Cell Inspector: Displays fine-grained mathematical formulas, atom attributes, and normalization breakdown
 */

import React from 'react';
import { CellInspection, MatrixResult } from '../types/chem';
import { Info, ArrowRight, CornerDownRight } from 'lucide-react';

interface CellInspectorProps {
  inspection: CellInspection | null;
  matrixResult: MatrixResult;
  mode?: 'basic' | 'advanced';
}

export const CellInspector: React.FC<CellInspectorProps> = ({ inspection, matrixResult, mode = 'basic' }) => {
  if (!inspection) {
    return (
      <div className="bg-[#0b0e17] border-t border-slate-800/80 px-6 py-3 flex items-center justify-between text-xs font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>
            {mode === 'basic'
              ? 'Hover or click any cell A[i, j] to inspect the connection between atoms.'
              : 'Hover over or click any cell in the adjacency matrix to inspect calculation details.'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Dimension: {matrixResult.dim}×{matrixResult.dim}</span>
          <span>Density: {matrixResult.density.toFixed(1)}%</span>
          {mode === 'advanced' && <span>Trace: {matrixResult.trace.toFixed(2)}</span>}
        </div>
      </div>
    );
  }

  const { row, col, atomRow, atomCol, isBonded, bondOrder, distance, rawValue, normalizedValue, formulaDescription, calculationSteps } = inspection;

  return (
    <div className="bg-[#0a0d16] border-t border-slate-800/80 px-6 py-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Atom coordinate badges */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-[#111728] border border-cyan-500/30 rounded-lg">
            <span className="text-[10px] font-mono text-slate-400 block">CELL COORDINATE</span>
            <span className="text-sm font-mono font-bold text-cyan-300">
              A[{row}, {col}]
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {/* Atom i */}
            <div className="px-2.5 py-1.5 bg-[#0f1422] border border-slate-700/80 rounded-lg">
              <span className="text-slate-400">Atom {row}: </span>
              <span className="font-bold" style={{ color: atomRow.color }}>
                {atomRow.symbol}
              </span>
              <span className="text-[10px] text-slate-500 ml-1.5">
                (index {row})
              </span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

            {/* Atom j */}
            <div className="px-2.5 py-1.5 bg-[#0f1422] border border-slate-700/80 rounded-lg">
              <span className="text-slate-400">Atom {col}: </span>
              <span className="font-bold" style={{ color: atomCol.color }}>
                {atomCol.symbol}
              </span>
              <span className="text-[10px] text-slate-500 ml-1.5">
                (index {col})
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Bond status & values */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block">CONNECTION</span>
            <span className={isBonded ? "text-emerald-400 font-semibold" : row === col ? "text-slate-400" : "text-slate-400"}>
              {row === col
                ? 'Self Loop (i = j): 0'
                : isBonded
                ? `Connected (${bondOrder === 1 ? 'Single' : bondOrder === 1.5 ? 'Aromatic' : bondOrder === 2 ? 'Double' : 'Triple'} Bond)`
                : 'Not Connected'}
            </span>
          </div>

          <div className="h-7 w-px bg-slate-800" />

          <div>
            <span className="text-[10px] text-slate-500 block">ADJACENCY VALUE</span>
            <span className="text-cyan-300 font-bold tabular-nums text-sm">
              {mode === 'basic' ? Math.round(rawValue) : rawValue.toFixed(4)}
            </span>
          </div>

          {mode === 'advanced' && matrixResult.normalization !== 'none' && (
            <>
              <div className="h-7 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-cyan-400 block">NORMALIZED</span>
                <span className="text-cyan-300 font-bold tabular-nums text-sm">
                  {normalizedValue.toFixed(4)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Formula & Calculation Steps */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <CornerDownRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-400">Definition:</span>
          <code className="text-cyan-200 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
            {mode === 'basic'
              ? (row === col
                  ? `A[${row}, ${col}] = 0 (No self-loops on atoms)`
                  : isBonded
                  ? `A[${row}, ${col}] = 1 (Atom ${row} is directly bonded to Atom ${col})`
                  : `A[${row}, ${col}] = 0 (No direct covalent bond between Atom ${row} and Atom ${col})`)
              : formulaDescription}
          </code>
        </div>

        {mode === 'advanced' && calculationSteps.length > 0 && (
          <div className="text-[11px] text-slate-400 truncate max-w-lg">
            {calculationSteps.join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
};
