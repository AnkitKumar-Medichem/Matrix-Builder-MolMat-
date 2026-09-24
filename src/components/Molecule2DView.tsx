/**
 * 2D Chemical Structure SVG Visualizer with bidirectional matrix crosshair interaction.
 */

import React, { useState } from 'react';
import { MoleculeGraph } from '../types/chem';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Molecule2DViewProps {
  graph: MoleculeGraph | null;
  hoveredCell: { row: number; col: number } | null;
  selectedCell: { row: number; col: number } | null;
  hoveredAtom: number | null;
  setHoveredAtom: (idx: number | null) => void;
  setSelectedCell: (cell: { row: number; col: number } | null) => void;
}

export const Molecule2DView: React.FC<Molecule2DViewProps> = ({
  graph,
  hoveredCell,
  selectedCell,
  hoveredAtom,
  setHoveredAtom,
  setSelectedCell,
}) => {
  const [zoom, setZoom] = useState(1);

  if (!graph || graph.atoms.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">
        No 2D structure available
      </div>
    );
  }

  const { atoms, bonds } = graph;

  // Active highlights
  const activeAtomA = hoveredCell?.row ?? selectedCell?.row ?? hoveredAtom ?? null;
  const activeAtomB = hoveredCell?.col ?? selectedCell?.col ?? null;

  return (
    <div className="relative w-full h-full bg-[#07090e] flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80">
      {/* HUD Zoom Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#111726]/90 border border-slate-700/80 rounded-lg p-1 z-10">
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono text-slate-400 px-1">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reset zoom"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 400 300"
        className="w-full h-full max-h-[380px] select-none"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Bonds Rendering */}
        {bonds.map((bond, idx) => {
          const u = atoms[bond.source];
          const v = atoms[bond.target];
          if (!u || !v) return null;

          const isHighlighted =
            (activeAtomA === bond.source && activeAtomB === bond.target) ||
            (activeAtomA === bond.target && activeAtomB === bond.source) ||
            activeAtomA === bond.source ||
            activeAtomA === bond.target;

          // Normal vector for multi-bond offsets
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          const strokeColor = isHighlighted ? '#22d3ee' : '#475569';
          const strokeWidth = isHighlighted ? 2.5 : 1.8;

          return (
            <g
              key={`bond-${idx}`}
              className="cursor-pointer group"
              onClick={() => setSelectedCell({ row: bond.source, col: bond.target })}
            >
              {/* Single bond */}
              {bond.order === 1.0 && (
                <line
                  x1={u.x}
                  y1={u.y}
                  x2={v.x}
                  y2={v.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  className="transition-colors group-hover:stroke-cyan-400"
                />
              )}

              {/* Double bond */}
              {bond.order === 2.0 && (
                <>
                  <line
                    x1={u.x + nx * 2.5}
                    y1={u.y + ny * 2.5}
                    x2={v.x + nx * 2.5}
                    y2={v.y + ny * 2.5}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                  <line
                    x1={u.x - nx * 2.5}
                    y1={u.y - ny * 2.5}
                    x2={v.x - nx * 2.5}
                    y2={v.y - ny * 2.5}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Triple bond */}
              {bond.order === 3.0 && (
                <>
                  <line
                    x1={u.x}
                    y1={u.y}
                    x2={v.x}
                    y2={v.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                  <line
                    x1={u.x + nx * 3.5}
                    y1={u.y + ny * 3.5}
                    x2={v.x + nx * 3.5}
                    y2={v.y + ny * 3.5}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                  <line
                    x1={u.x - nx * 3.5}
                    y1={u.y - ny * 3.5}
                    x2={v.x - nx * 3.5}
                    y2={v.y - ny * 3.5}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Aromatic bond (1.5) */}
              {bond.order === 1.5 && (
                <>
                  <line
                    x1={u.x}
                    y1={u.y}
                    x2={v.x}
                    y2={v.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                  <line
                    x1={u.x + nx * 3}
                    y1={u.y + ny * 3}
                    x2={v.x + nx * 3}
                    y2={v.y + ny * 3}
                    stroke={strokeColor}
                    strokeWidth={1.5}
                    strokeDasharray="3,3"
                    strokeLinecap="round"
                  />
                </>
              )}
            </g>
          );
        })}

        {/* Atoms Rendering */}
        {atoms.map((atom) => {
          const isHighlighted = activeAtomA === atom.index || activeAtomB === atom.index;
          const radius = isHighlighted ? 14 : 11;

          return (
            <g
              key={`atom-${atom.index}`}
              className="cursor-pointer transition-transform"
              onMouseEnter={() => setHoveredAtom(atom.index)}
              onMouseLeave={() => setHoveredAtom(null)}
              onClick={() => setSelectedCell({ row: atom.index, col: atom.index })}
            >
              {/* Highlight Aura */}
              {isHighlighted && (
                <circle
                  cx={atom.x}
                  cy={atom.y}
                  r={18}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  strokeDasharray="4,2"
                  filter="url(#glow)"
                />
              )}

              {/* Atom Node Circle */}
              <circle
                cx={atom.x}
                cy={atom.y}
                r={radius}
                fill="#0b0e17"
                stroke={isHighlighted ? '#38bdf8' : atom.color}
                strokeWidth={isHighlighted ? 2.5 : 1.8}
              />

              {/* Element Symbol */}
              <text
                x={atom.x}
                y={atom.y + 3.5}
                textAnchor="middle"
                fontSize={atom.symbol.length > 1 ? '9px' : '11px'}
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
                fill={atom.color}
              >
                {atom.symbol}
              </text>

              {/* Atom Index Subscript */}
              <text
                x={atom.x + 8}
                y={atom.y + 12}
                fontSize="8px"
                fontFamily="JetBrains Mono, monospace"
                fill="#94a3b8"
              >
                {atom.index}
              </text>

              {/* Formal Charge */}
              {atom.charge !== 0 && (
                <text
                  x={atom.x + 8}
                  y={atom.y - 6}
                  fontSize="8px"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                  fill="#f43f5e"
                >
                  {atom.charge > 0 ? (atom.charge === 1 ? '+' : `+${atom.charge}`) : (atom.charge === -1 ? '−' : `${atom.charge}`)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
