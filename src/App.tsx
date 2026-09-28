/**
 * Simple, Clean SMILES Adjacency Matrix Builder (MolMat)
 * Supports optional chemical weighting techniques with respect to Carbon:
 * - Plain binary adjacency (default)
 * - Covalent radius (rel. Carbon)
 * - Van der Waals radius (rel. Carbon)
 * - Atomic mass (rel. Carbon)
 * - Pauling electronegativity (rel. Carbon)
 * - Polarizability (rel. Carbon)
 * - Bond Order
 */

import React, { useState, useMemo } from 'react';
import { parseSmiles } from './utils/smilesParser';
import { calculateMatrix } from './utils/matrixCalculations';
import { MatrixType, MoleculeGraph, MatrixResult } from './types/chem';
import { CARBON_REF } from './utils/elements';
import { EigenvalueBarChart } from './components/EigenvalueBarChart';

const WEIGHTING_OPTIONS: { id: MatrixType; label: string; formula: string; description: string }[] = [
  {
    id: 'plain',
    label: 'None (Plain Adjacency Matrix)',
    formula: 'A[i, j] = Step distance (0 on diagonal)',
    description: 'Core molecular adjacency matrix showing topological atomic connectivity and distances',
  },
  {
    id: 'bond_order',
    label: 'Bond Order',
    formula: 'A[i, j] = Bond Order (1, 1.5, 2, 3)',
    description: 'Weights edges by covalent bond multiplicity',
  },
  {
    id: 'atomic_number_prod',
    label: 'Atomic Number Product (Z_i · Z_j)',
    formula: 'A[i, j] = Z_i · Z_j for bonded pairs',
    description: 'Nuclear charge product (e.g. C-C = 36, C-N = 42, C-O = 48)',
  },
  {
    id: 'atomic_radius_sum',
    label: 'Covalent Radius Sum (r_i + r_j)',
    formula: 'A[i, j] = r_cov(i) + r_cov(j) (pm)',
    description: 'Sum of atomic covalent radii in picometers (e.g. C-C = 152 pm)',
  },
  {
    id: 'electronegativity_diff',
    label: 'Electronegativity Difference (|Δχ|)',
    formula: 'A[i, j] = |χ_i - χ_j| for bonded pairs',
    description: 'Pauling electronegativity difference measuring bond polarity',
  },
  {
    id: 'laplacian',
    label: 'Degree Laplacian (L = D - A)',
    formula: 'L[i, i] = deg(i), L[i, j] = -1 if bonded',
    description: 'Graph Laplacian for spectral analysis and algebraic connectivity',
  },
  {
    id: 'covalent_radius_rel_carbon',
    label: 'Covalent Radius (rel. Carbon)',
    formula: 'A[i, j] = ((r_i + r_j)/2) / r_cov(C)',
    description: `Mean covalent radius of bonded atoms normalized to Carbon (${CARBON_REF.covalentRadius} pm)`,
  },
  {
    id: 'electronegativity_rel_carbon',
    label: 'Pauling Electronegativity (rel. Carbon)',
    formula: 'A[i, j] = ((χ_i + χ_j)/2) / χ(C)',
    description: `Mean Pauling electronegativity of bonded atoms normalized to Carbon (${CARBON_REF.electronegativity})`,
  },
];

export default function App() {
  const [smiles, setSmiles] = useState<string>('c1ccccc1');
  const [weighting, setWeighting] = useState<MatrixType>('plain');
  const [hasRun, setHasRun] = useState<boolean>(false);
  const partitionSize = 52; // Fixed to L size
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  // Calculation state: only calculated and generated after clicking "Run"
  const [calculation, setCalculation] = useState<{
    graph: MoleculeGraph | null;
    matrixResult: MatrixResult | null;
    error: string | null;
    weighting: MatrixType;
  } | null>(null);

  const performCalculation = (smilesInput: string, matrixWeighting: MatrixType) => {
    try {
      const trimmed = smilesInput.trim();
      if (!trimmed) {
        setCalculation({
          graph: null,
          matrixResult: null,
          error: 'Please enter a SMILES string',
          weighting: matrixWeighting,
        });
        return;
      }
      const g = parseSmiles(trimmed, { includeHydrogens: false });
      const mResult = calculateMatrix(g, matrixWeighting, 'none');
      setCalculation({
        graph: g,
        matrixResult: mResult,
        error: null,
        weighting: matrixWeighting,
      });
      // Default keyboard selected cell to [0, 0] on successful calculation
      setSelectedCell({ row: 0, col: 0 });
    } catch (err: any) {
      setCalculation({
        graph: null,
        matrixResult: null,
        error: err.message || 'Invalid SMILES string',
        weighting: matrixWeighting,
      });
    }
  };

  const handleRun = () => {
    setHasRun(true);
    performCalculation(smiles, weighting);
  };

  const handleTableKeyDown = (e: React.KeyboardEvent) => {
    if (!graph || !matrixResult) return;
    const n = graph.atoms.length;
    if (n === 0) return;

    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }

    e.preventDefault();
    const current = selectedCell || hoveredCell || { row: 0, col: 0 };
    let newRow = current.row;
    let newCol = current.col;

    switch (e.key) {
      case 'ArrowUp':
        newRow = Math.max(0, current.row - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(n - 1, current.row + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, current.col - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(n - 1, current.col + 1);
        break;
      case 'Home':
        newCol = 0;
        break;
      case 'End':
        newCol = n - 1;
        break;
      default:
        return;
    }

    setSelectedCell({ row: newRow, col: newCol });
    setHoveredCell({ row: newRow, col: newCol });

    // Focus cell in DOM
    const cellEl = document.getElementById(`matrix-cell-${newRow}-${newCol}`);
    if (cellEl) {
      cellEl.focus();
      cellEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  const handleWeightingSelect = (newWeighting: MatrixType) => {
    setWeighting(newWeighting);
    // If output is already active on the screen, immediately recalculate with the new weighting
    if (hasRun) {
      performCalculation(smiles, newWeighting);
    }
  };

  const graph = calculation?.graph ?? null;
  const matrixResult = calculation?.matrixResult ?? null;
  const error = calculation?.error ?? null;
  const currentWeighting = calculation?.weighting ?? weighting;
  const activeWeightingOpt = WEIGHTING_OPTIONS.find((opt) => opt.id === (calculation ? currentWeighting : weighting)) || WEIGHTING_OPTIONS[0];
  const isPlain = currentWeighting === 'plain';

  // Format matrix cell value
  const formatCellValue = (val: number): string => {
    if (Math.abs(val) < 1e-9) return '0';
    // Clean integers (e.g. 1, 2, 3, 36, 152, -1)
    if (Math.abs(val - Math.round(val)) < 1e-6) {
      return Math.round(val).toString();
    }
    // Half-integers (e.g. 1.5 for aromatic bond order)
    if (Math.abs(val * 2 - Math.round(val * 2)) < 1e-6) {
      return val.toFixed(1);
    }
    return val.toFixed(3);
  };

  // Export current matrix as CSV
  const handleExportCSV = () => {
    if (!graph || !matrixResult) return;

    // Header row with atom labels (e.g. C0, C1, O2)
    const headers = ['Atom', ...graph.atoms.map((atom) => `${atom.symbol}${atom.index}`)];
    const csvRows: string[] = [headers.join(',')];

    // Data rows
    matrixResult.matrix.forEach((row, i) => {
      const atomLabel = `${graph.atoms[i]?.symbol}${i}`;
      const values = row.map((val) => formatCellValue(val));
      csvRows.push([atomLabel, ...values].join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `molmat_${graph.canonicalFormula || 'matrix'}_${currentWeighting}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            MolMat
          </h1>
        </div>

        {/* SMILES Input Box */}
        <div className="space-y-2">
          <label htmlFor="smiles-input" className="block text-sm font-medium text-gray-700">
            SMILES Input
          </label>
          <div className="flex gap-2">
            <input
              id="smiles-input"
              type="text"
              value={smiles}
              onChange={(e) => setSmiles(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRun();
                }
              }}
              placeholder="e.g. c1ccccc1, CCO, CC(=O)O"
              className="flex-1 px-4 py-2.5 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-xs"
              spellCheck={false}
            />
            {smiles && (
              <button
                type="button"
                onClick={() => setSmiles('')}
                className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Weighting Technique Selector (Optional, Plain by default) */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label htmlFor="weighting-select" className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Weighting Technique (Optional):
            </label>
            <div className="flex items-center gap-2">
              <select
                id="weighting-select"
                value={weighting}
                onChange={(e) => handleWeightingSelect(e.target.value as MatrixType)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {WEIGHTING_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {!isPlain && (
                <button
                  type="button"
                  onClick={() => handleWeightingSelect('plain')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Reset to Plain
                </button>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 font-mono">
            <span className="text-gray-700 font-semibold">{activeWeightingOpt.label}:</span>
            <span>{activeWeightingOpt.formula}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">{activeWeightingOpt.description}</span>
          </div>
        </div>

        {/* Run Button */}
        <div>
          <button
            type="button"
            onClick={handleRun}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-md shadow-xs transition-colors cursor-pointer"
            title="Calculate matrix (or press Enter in SMILES input)"
          >
            <span>Run</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-normal bg-blue-700 text-blue-100 rounded border border-blue-500/50">
              Enter ↵
            </kbd>
          </button>
        </div>

        {/* Error Message (shown only after clicking Run) */}
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Molecular Info Badge */}
        {graph && !error && (
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-md text-gray-700">
            <div>
              Formula: <strong className="text-gray-900">{graph.canonicalFormula}</strong>
            </div>
            <span className="text-gray-300">|</span>
            <div>
              Atoms: <strong className="text-gray-900">{graph.atoms.length}</strong>
            </div>
            <span className="text-gray-300">|</span>
            <div>
              Bonds: <strong className="text-gray-900">{graph.bonds.length}</strong>
            </div>
            <span className="text-gray-300">|</span>
            <div>
              Weighting: <strong className="text-blue-700">{activeWeightingOpt.label}</strong>
            </div>
            <span className="text-gray-300">|</span>
            <div>
              Matrix Sum: <strong className="text-blue-800">{matrixResult ? (isPlain ? matrixResult.matrixSum : matrixResult.matrixSum.toFixed(3)) : 0}</strong>
            </div>
            <span className="text-gray-300">|</span>
            <div>
              Wiener Index: <strong className="text-emerald-700">{matrixResult?.wienerIndex ?? 0}</strong>
            </div>
          </div>
        )}

        {/* Main Content Area: 2D Diagram & Matrix */}
        {graph && matrixResult && !error && (
          <div className="flex flex-col gap-6">
            {/* 2D Chemical Diagram */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-xs">
              <h2 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-2">
                Molecular Structure
              </h2>
              <div className="w-full h-72 flex items-center justify-center bg-gray-50 rounded-md border border-gray-100 overflow-hidden">
                <svg
                  viewBox="0 0 400 300"
                  className="w-full h-full select-none"
                >
                  {/* Bonds */}
                  {graph.bonds.map((bond, idx) => {
                    const u = graph.atoms[bond.source];
                    const v = graph.atoms[bond.target];
                    if (!u || !v) return null;

                    const isHovered =
                      (hoveredCell?.row === bond.source && hoveredCell?.col === bond.target) ||
                      (hoveredCell?.row === bond.target && hoveredCell?.col === bond.source);

                    return (
                      <line
                        key={`b-${idx}`}
                        x1={u.x}
                        y1={u.y}
                        x2={v.x}
                        y2={v.y}
                        stroke={isHovered ? '#2563eb' : '#64748b'}
                        strokeWidth={isHovered ? 3 : 2}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {/* Atoms */}
                  {graph.atoms.map((atom) => {
                    const isHovered =
                      hoveredCell?.row === atom.index || hoveredCell?.col === atom.index;

                    return (
                      <g key={`a-${atom.index}`}>
                        <circle
                          cx={atom.x}
                          cy={atom.y}
                          r={isHovered ? 13 : 11}
                          fill="white"
                          stroke={isHovered ? '#2563eb' : '#334155'}
                          strokeWidth={isHovered ? 2.5 : 1.5}
                        />
                        <text
                          x={atom.x}
                          y={atom.y + 4}
                          textAnchor="middle"
                          fontSize="10px"
                          fontWeight="bold"
                          fontFamily="monospace"
                          fill={isHovered ? '#2563eb' : '#0f172a'}
                        >
                          {atom.symbol}
                        </text>
                        <text
                          x={atom.x + 8}
                          y={atom.y + 12}
                          fontSize="8px"
                          fontFamily="monospace"
                          fill="#64748b"
                        >
                          {atom.index}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 text-center">
                Numbers indicate the atom indices in the matrix rows/columns.
              </p>
            </div>

            {/* Adjacency Matrix Table */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-2 gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Adjacency Matrix ({matrixResult.dim} × {matrixResult.dim})
                  </h2>
                  <span className="text-xs font-mono text-gray-500">
                    {isPlain ? 'Topological step distances (0 on diagonal)' : activeWeightingOpt.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                    <kbd className="font-mono font-semibold">↑</kbd>
                    <kbd className="font-mono font-semibold">↓</kbd>
                    <kbd className="font-mono font-semibold">←</kbd>
                    <kbd className="font-mono font-semibold">→</kbd>
                    <span className="ml-1">Arrow keys</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded shadow-2xs hover:text-blue-600 transition-colors cursor-pointer"
                    title="Download matrix as CSV file"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Uniform Square Matrix Container */}
              <div
                tabIndex={0}
                onKeyDown={handleTableKeyDown}
                role="region"
                aria-label="Adjacency Matrix Table with keyboard arrow key navigation"
                className="overflow-auto max-h-96 border border-gray-200 rounded-md bg-gray-50/50 p-3 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
              >
                <div className="w-fit min-w-fit mx-auto shadow-2xs rounded bg-white overflow-hidden border border-gray-300">
                  <table
                    className="border-collapse font-mono text-center table-fixed"
                    style={{
                      width: `${(graph.atoms.length + 1) * partitionSize}px`,
                      height: `${(graph.atoms.length + 1) * partitionSize}px`,
                    }}
                  >
                    <colgroup>
                      <col style={{ width: `${partitionSize}px`, minWidth: `${partitionSize}px` }} />
                      {graph.atoms.map((_, j) => (
                        <col key={`col-w-${j}`} style={{ width: `${partitionSize}px`, minWidth: `${partitionSize}px` }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr style={{ height: `${partitionSize}px` }}>
                        {/* Top-Left Corner Cell */}
                        <th
                          style={{
                            width: `${partitionSize}px`,
                            height: `${partitionSize}px`,
                            minWidth: `${partitionSize}px`,
                            maxWidth: `${partitionSize}px`,
                          }}
                          className="p-0 bg-gray-100 border border-gray-200 text-gray-400 font-normal text-[10px]"
                          title="Row index \ Column index"
                        >
                          <div className="w-full h-full flex items-center justify-center">
                            i \ j
                          </div>
                        </th>
                        {/* Column Header Cells */}
                        {graph.atoms.map((atom, j) => {
                          const activeCol = (hoveredCell?.col ?? selectedCell?.col) === j;
                          return (
                            <th
                              key={`col-${j}`}
                              style={{
                                width: `${partitionSize}px`,
                                height: `${partitionSize}px`,
                                minWidth: `${partitionSize}px`,
                                maxWidth: `${partitionSize}px`,
                              }}
                              className={`p-0 border border-gray-200 transition-colors ${
                                activeCol ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              <div className="w-full h-full flex flex-col items-center justify-center leading-none gap-0.5">
                                <span className="font-bold" style={{ fontSize: partitionSize <= 36 ? '10px' : '11px' }}>
                                  {atom.symbol}
                                </span>
                                <span className="text-gray-400 font-normal" style={{ fontSize: partitionSize <= 36 ? '8px' : '9px' }}>
                                  {j}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixResult.matrix.map((rowArr, i) => {
                        const atomI = graph.atoms[i];
                        const activeRow = (hoveredCell?.row ?? selectedCell?.row) === i;
                        return (
                          <tr key={`row-${i}`} style={{ height: `${partitionSize}px` }}>
                            {/* Row Header Cell */}
                            <td
                              style={{
                                width: `${partitionSize}px`,
                                height: `${partitionSize}px`,
                                minWidth: `${partitionSize}px`,
                                maxWidth: `${partitionSize}px`,
                              }}
                              className={`p-0 bg-gray-100 border border-gray-200 transition-colors font-medium ${
                                activeRow ? 'bg-blue-100 text-blue-900 font-bold' : 'text-gray-700'
                              }`}
                            >
                              <div className="w-full h-full flex flex-col items-center justify-center leading-none gap-0.5">
                                <span className="font-bold" style={{ fontSize: partitionSize <= 36 ? '10px' : '11px' }}>
                                  {atomI.symbol}
                                </span>
                                <span className="text-gray-400 font-normal" style={{ fontSize: partitionSize <= 36 ? '8px' : '9px' }}>
                                  {i}
                                </span>
                              </div>
                            </td>

                            {/* Matrix Data Cell Partitions (Equal-Sized Squares) */}
                            {rowArr.map((val, j) => {
                              const isBonded = val > 0;
                              const isSelected = selectedCell?.row === i && selectedCell?.col === j;
                              const isHovered = hoveredCell?.row === i && hoveredCell?.col === j;
                              const isActive = isSelected || isHovered;
                              const activeC = hoveredCell || selectedCell;
                              const isCrosshair = activeC?.row === i || activeC?.col === j;
                              const displayVal = formatCellValue(val);

                              return (
                                <td
                                  key={`cell-${i}-${j}`}
                                  id={`matrix-cell-${i}-${j}`}
                                  tabIndex={isSelected ? 0 : -1}
                                  onClick={() => {
                                    setSelectedCell({ row: i, col: j });
                                    setHoveredCell({ row: i, col: j });
                                  }}
                                  onMouseEnter={() => setHoveredCell({ row: i, col: j })}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  onFocus={() => {
                                    setSelectedCell({ row: i, col: j });
                                    setHoveredCell({ row: i, col: j });
                                  }}
                                  onKeyDown={handleTableKeyDown}
                                  style={{
                                    width: `${partitionSize}px`,
                                    height: `${partitionSize}px`,
                                    minWidth: `${partitionSize}px`,
                                    maxWidth: `${partitionSize}px`,
                                  }}
                                  className={`p-0 border border-gray-200 transition-colors cursor-pointer select-none outline-none relative ${
                                    isActive
                                      ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-500 ring-offset-1 z-10'
                                      : isBonded
                                      ? isCrosshair
                                        ? 'bg-blue-100 text-blue-900 font-bold'
                                        : 'bg-blue-50 text-blue-800 font-semibold'
                                      : isCrosshair
                                      ? 'bg-gray-100 text-gray-700'
                                      : 'text-gray-400 bg-white hover:bg-gray-50'
                                  }`}
                                  title={`A[${i}, ${j}] = ${displayVal} (${atomI.symbol}${i} - ${graph.atoms[j].symbol}${j})`}
                                >
                                  <div
                                    className="w-full h-full flex items-center justify-center font-mono leading-none"
                                    style={{
                                      fontSize:
                                        partitionSize <= 36
                                          ? displayVal.length > 3
                                            ? '9px'
                                            : '11px'
                                          : displayVal.length > 4
                                          ? '10px'
                                          : '11.5px',
                                    }}
                                  >
                                    {displayVal}
                                  </div>
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

              {/* Topological & Matrix Indices Info (Molecular Size & Branching) */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs space-y-2">
                <div className="border-b border-gray-200 pb-1.5">
                  <span className="font-semibold text-gray-800">
                    Matrix & Topological Indices
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-gray-700">
                  <div className="bg-white p-2 rounded border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">
                      Matrix Sum (Σ M)
                    </div>
                    <div className="text-base font-bold text-blue-700">
                      {isPlain ? matrixResult.matrixSum.toString() : matrixResult.matrixSum.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                      Sum of all matrix elements
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">
                      Upper Triangle Sum (i &lt; j)
                    </div>
                    <div className="text-base font-bold text-gray-900">
                      {isPlain ? matrixResult.halfSum.toString() : matrixResult.halfSum.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                      {isPlain ? 'Half-sum of symmetric step distances' : 'Half-sum of symmetric matrix'}
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">
                      Wiener Index (W)
                    </div>
                    <div className="text-base font-bold text-emerald-700">
                      {matrixResult.wienerIndex}
                    </div>
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                      Sum of shortest topological distances
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">
                      Randic Index (R)
                    </div>
                    <div className="text-base font-bold text-purple-700">
                      {matrixResult.randicIndex.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                      Branching index: Σ 1/√(deg_u × deg_v)
                    </div>
                  </div>
                </div>
              </div>

              {/* Active / Focused / Hovered Cell Inspection Breakdown */}
              {(() => {
                const activeC = hoveredCell || selectedCell;
                if (!activeC) return null;
                const cellVal = matrixResult.matrix[activeC.row]?.[activeC.col] ?? 0;
                return (
                  <div className="text-xs font-mono bg-blue-50/70 border border-blue-200 p-2.5 rounded-md text-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                      <span>
                        A[{activeC.row}, {activeC.col}] ={' '}
                        <strong className="text-blue-700 font-bold">
                          {formatCellValue(cellVal)}
                        </strong>
                      </span>
                    </div>
                    <div>
                      {cellVal > 0 ? (
                        <span className="text-blue-800 font-medium">
                          Atoms: {graph.atoms[activeC.row]?.symbol}{activeC.row} - {graph.atoms[activeC.col]?.symbol}{activeC.col}
                          {!isPlain && ` (${activeWeightingOpt.label})`}
                        </span>
                      ) : activeC.row === activeC.col ? (
                        <span className="text-gray-500">Diagonal entry: 0</span>
                      ) : (
                        <span className="text-gray-500">
                          Zero entry between {graph.atoms[activeC.row]?.symbol}{activeC.row} and {graph.atoms[activeC.col]?.symbol}{activeC.col}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Eigenvalue Spectrum / Spectral Profile Bar Chart */}
            <EigenvalueBarChart
              eigenvalues={matrixResult.eigenvalues}
              matrixTypeLabel={activeWeightingOpt.label}
            />
          </div>
        )}
      </div>
    </div>
  );
}
