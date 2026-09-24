/**
 * Interactive Adjacency Matrix Grid with heatmap rendering, crosshairs, and synchronized atom inspections.
 */

import React, { useMemo } from 'react';
import { Atom, MatrixResult } from '../types/chem';

interface MatrixGridProps {
  matrixResult: MatrixResult;
  atoms: Atom[];
  hoveredCell: { row: number; col: number } | null;
  setHoveredCell: (cell: { row: number; col: number } | null) => void;
  selectedCell: { row: number; col: number } | null;
  setSelectedCell: (cell: { row: number; col: number } | null) => void;
  hoveredAtom: number | null;
  setHoveredAtom: (atom: number | null) => void;
  precision: number;
  colorScheme: 'cyan' | 'amber' | 'mono' | 'spectral' | 'coolwarm';
  showLabels: boolean;
}

export const MatrixGrid: React.FC<MatrixGridProps> = ({
  matrixResult,
  atoms,
  hoveredCell,
  setHoveredCell,
  selectedCell,
  setSelectedCell,
  hoveredAtom,
  setHoveredAtom,
  precision,
  colorScheme,
  showLabels,
}) => {
  const { matrix, minVal, maxVal, dim } = matrixResult;

  // Compute color interpolator
  const getCellColor = useMemo(() => {
    return (val: number): { bg: string; text: string; border: string } => {
      if (dim === 0) return { bg: 'transparent', text: '#94a3b8', border: 'transparent' };
      
      const range = maxVal - minVal;
      const normalized = range > 1e-9 ? Math.max(0, Math.min(1, (val - minVal) / range)) : 0;
      const isZero = Math.abs(val) < 1e-6;

      if (isZero) {
        return {
          bg: '#070a11',
          text: '#475569',
          border: 'rgba(30, 41, 59, 0.4)',
        };
      }

      if (colorScheme === 'cyan') {
        const alpha = Math.max(0.12, normalized * 0.85);
        return {
          bg: `rgba(6, 182, 212, ${alpha})`,
          text: normalized > 0.6 ? '#ffffff' : '#a5f3fc',
          border: `rgba(6, 182, 212, ${Math.min(1, alpha + 0.2)})`,
        };
      }

      if (colorScheme === 'amber') {
        const alpha = Math.max(0.12, normalized * 0.85);
        return {
          bg: `rgba(245, 158, 11, ${alpha})`,
          text: normalized > 0.6 ? '#ffffff' : '#fde68a',
          border: `rgba(245, 158, 11, ${Math.min(1, alpha + 0.2)})`,
        };
      }

      if (colorScheme === 'spectral') {
        // Hue from 220 (blue) to 0 (red)
        const hue = (1 - normalized) * 230;
        return {
          bg: `hsla(${hue}, 75%, 45%, 0.35)`,
          text: '#ffffff',
          border: `hsla(${hue}, 80%, 60%, 0.5)`,
        };
      }

      if (colorScheme === 'coolwarm') {
        // Red for positive, blue for negative if zero centered
        if (val < 0) {
          const negRatio = Math.min(1, Math.abs(val) / (Math.abs(minVal) || 1));
          return {
            bg: `rgba(59, 130, 246, ${Math.max(0.15, negRatio * 0.7)})`,
            text: '#bfdbfe',
            border: `rgba(59, 130, 246, 0.6)`,
          };
        } else {
          const posRatio = Math.min(1, val / (maxVal || 1));
          return {
            bg: `rgba(239, 68, 68, ${Math.max(0.15, posRatio * 0.7)})`,
            text: '#fecaca',
            border: `rgba(239, 68, 68, 0.6)`,
          };
        }
      }

      // Mono / lab slate
      const alpha = Math.max(0.08, normalized * 0.75);
      return {
        bg: `rgba(226, 232, 240, ${alpha})`,
        text: normalized > 0.5 ? '#ffffff' : '#cbd5e1',
        border: `rgba(226, 232, 240, 0.25)`,
      };
    };
  }, [minVal, maxVal, dim, colorScheme]);

  if (dim === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 font-mono text-xs">
        No atoms to display. Please enter a valid SMILES string.
      </div>
    );
  }

  // Active crosshairs
  const activeRow = hoveredCell?.row ?? selectedCell?.row ?? hoveredAtom ?? null;
  const activeCol = hoveredCell?.col ?? selectedCell?.col ?? hoveredAtom ?? null;

  return (
    <div className="relative w-full h-full overflow-auto select-none bg-[#07090e] p-4">
      <div className="inline-block min-w-full">
        <table className="border-collapse font-mono text-xs tabular-nums mx-auto">
          <thead>
            <tr>
              {/* Top-left corner empty cell */}
              <th className="sticky top-0 left-0 z-30 bg-[#0c101c] p-2 border-b border-r border-slate-700/80 text-[10px] text-slate-500 uppercase tracking-wider">
                A(i, j)
              </th>

              {/* Column headers (Atoms) */}
              {atoms.map((atom, j) => {
                const isColActive = activeCol === j;
                return (
                  <th
                    key={`col-${j}`}
                    onMouseEnter={() => setHoveredAtom(j)}
                    onMouseLeave={() => setHoveredAtom(null)}
                    onClick={() => setSelectedCell({ row: j, col: j })}
                    className={`sticky top-0 z-20 px-2 py-1.5 border-b border-slate-800 transition-colors cursor-pointer text-center ${
                      isColActive
                        ? 'bg-cyan-950/80 text-cyan-300 font-bold border-b-2 border-cyan-400 shadow-sm'
                        : 'bg-[#0b0e17] text-slate-400 hover:text-slate-200'
                    }`}
                    title={`Atom ${j}: ${atom.symbol} (Z=${atom.atomicNumber}, χ=${atom.electronegativity})`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">{j}</span>
                      <span className="text-xs font-semibold" style={{ color: atom.color }}>
                        {atom.symbol}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {matrix.map((rowArr, i) => {
              const atomI = atoms[i];
              const isRowActive = activeRow === i;

              return (
                <tr key={`row-${i}`}>
                  {/* Row Header (Atom i) */}
                  <th
                    onMouseEnter={() => setHoveredAtom(i)}
                    onMouseLeave={() => setHoveredAtom(null)}
                    onClick={() => setSelectedCell({ row: i, col: i })}
                    className={`sticky left-0 z-10 px-2.5 py-1.5 border-r border-slate-800 transition-colors cursor-pointer text-left whitespace-nowrap ${
                      isRowActive
                        ? 'bg-cyan-950/80 text-cyan-300 font-bold border-r-2 border-cyan-400'
                        : 'bg-[#0b0e17] text-slate-400 hover:text-slate-200'
                    }`}
                    title={`Atom ${i}: ${atomI?.symbol} (Z=${atomI?.atomicNumber}, χ=${atomI?.electronegativity})`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 w-3">{i}</span>
                      <span className="text-xs font-semibold" style={{ color: atomI?.color }}>
                        {atomI?.symbol}
                      </span>
                    </div>
                  </th>

                  {/* Matrix Cells A[i, j] */}
                  {rowArr.map((val, j) => {
                    const isSelected = selectedCell?.row === i && selectedCell?.col === j;
                    const isHovered = hoveredCell?.row === i && hoveredCell?.col === j;
                    const isCrosshair = activeRow === i || activeCol === j;
                    const isDiagonal = i === j;
                    const style = getCellColor(val);

                    return (
                      <td
                        key={`cell-${i}-${j}`}
                        onMouseEnter={() => setHoveredCell({ row: i, col: j })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => setSelectedCell({ row: i, col: j })}
                        style={{
                          backgroundColor: style.bg,
                          color: style.text,
                        }}
                        className={`relative px-2 py-1.5 text-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-[#07090e] z-10 border-cyan-300'
                            : isHovered
                            ? 'ring-1 ring-white/80 z-10'
                            : isCrosshair
                            ? 'border-cyan-800/40'
                            : 'border-slate-800/40'
                        } ${isDiagonal ? 'outline-dashed outline-1 outline-slate-600/30' : ''}`}
                        title={`A[${i}, ${j}] = ${val.toFixed(4)} (Atom ${i} ${atomI?.symbol} - Atom ${j} ${atoms[j]?.symbol})`}
                      >
                        {showLabels ? (
                          <span className="tracking-tight text-[11px]">
                            {precision === 0 ? Math.round(val) : val.toFixed(precision)}
                          </span>
                        ) : (
                          <span className="inline-block w-4 h-4 rounded-sm" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
