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
import { MatrixType } from './types/chem';
import { CARBON_REF } from './utils/elements';

const WEIGHTING_OPTIONS: { id: MatrixType; label: string; formula: string; description: string }[] = [
  {
    id: 'plain',
    label: 'None (Plain Adjacency)',
    formula: 'A[i, j] = 1 if bonded, 0 otherwise',
    description: 'Binary adjacency matrix showing atomic connectivity',
  },
  {
    id: 'bond_order',
    label: 'Bond Order',
    formula: 'A[i, j] = Bond Order (1, 1.5, 2, 3)',
    description: 'Weights edges by covalent bond multiplicity',
  },
  {
    id: 'covalent_radius_rel_carbon',
    label: 'Covalent Radius (rel. Carbon)',
    formula: 'A[i, j] = ((r_i + r_j)/2) / r_cov(C)',
    description: `Mean covalent radius of bonded atoms normalized to Carbon (${CARBON_REF.covalentRadius} pm)`,
  },
  {
    id: 'vdw_radius_rel_carbon',
    label: 'Van der Waals Radius (rel. Carbon)',
    formula: 'A[i, j] = ((r_vdw_i + r_vdw_j)/2) / r_vdw(C)',
    description: `Mean van der Waals radius of bonded atoms normalized to Carbon (${CARBON_REF.vdwRadius} pm)`,
  },
  {
    id: 'atomic_mass_rel_carbon',
    label: 'Atomic Mass (rel. Carbon)',
    formula: 'A[i, j] = ((m_i + m_j)/2) / m(C)',
    description: `Mean atomic mass of bonded atoms normalized to Carbon (${CARBON_REF.atomicMass} Da)`,
  },
  {
    id: 'electronegativity_rel_carbon',
    label: 'Pauling Electronegativity (rel. Carbon)',
    formula: 'A[i, j] = ((χ_i + χ_j)/2) / χ(C)',
    description: `Mean Pauling electronegativity of bonded atoms normalized to Carbon (${CARBON_REF.electronegativity})`,
  },
  {
    id: 'polarizability_rel_carbon',
    label: 'Polarizability (rel. Carbon)',
    formula: 'A[i, j] = ((α_i + α_j)/2) / α(C)',
    description: `Mean atomic polarizability of bonded atoms normalized to Carbon (${CARBON_REF.polarizability} Å³)`,
  },
];

export default function App() {
  const [smiles, setSmiles] = useState<string>('c1ccccc1');
  const [weighting, setWeighting] = useState<MatrixType>('plain');
  const partitionSize = 52; // Fixed to L size
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  // Parse SMILES string into molecular graph
  const { graph, error } = useMemo(() => {
    try {
      const trimmed = smiles.trim();
      if (!trimmed) {
        return { graph: null, error: 'Please enter a SMILES string' };
      }
      const g = parseSmiles(trimmed, { includeHydrogens: false });
      return { graph: g, error: null };
    } catch (err: any) {
      return { graph: null, error: err.message || 'Invalid SMILES string' };
    }
  }, [smiles]);

  // Matrix calculation based on selected weighting technique
  const matrixResult = useMemo(() => {
    if (!graph) return null;
    return calculateMatrix(graph, weighting, 'none');
  }, [graph, weighting]);

  const activeWeightingOpt = WEIGHTING_OPTIONS.find((opt) => opt.id === weighting) || WEIGHTING_OPTIONS[0];
  const isPlain = weighting === 'plain';

  // Format matrix cell value
  const formatCellValue = (val: number): string => {
    if (val === 0) return '0';
    if (isPlain) return '1';
    if (weighting === 'bond_order') {
      return val % 1 === 0 ? val.toString() : val.toFixed(1);
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
    const filename = `molmat_${graph.canonicalFormula || 'matrix'}_${weighting}.csv`;
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

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md mt-2">
              {error}
            </div>
          )}
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
                onChange={(e) => setWeighting(e.target.value as MatrixType)}
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
                  onClick={() => setWeighting('plain')}
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
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">{activeWeightingOpt.description}</span>
          </div>
        </div>

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
                <div className="flex items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Adjacency Matrix ({matrixResult.dim} × {matrixResult.dim})
                  </h2>
                  <span className="text-xs font-mono text-gray-500">
                    {isPlain ? '1 = Connected, 0 = Not connected' : activeWeightingOpt.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded shadow-2xs hover:text-blue-600 transition-colors cursor-pointer self-start sm:self-auto"
                  title="Download matrix as CSV file"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </div>

              {/* Uniform Square Matrix Container */}
              <div className="overflow-auto max-h-96 border border-gray-200 rounded-md bg-gray-50/50 p-3">
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
                        {graph.atoms.map((atom, j) => (
                          <th
                            key={`col-${j}`}
                            style={{
                              width: `${partitionSize}px`,
                              height: `${partitionSize}px`,
                              minWidth: `${partitionSize}px`,
                              maxWidth: `${partitionSize}px`,
                            }}
                            className={`p-0 border border-gray-200 transition-colors ${
                              hoveredCell?.col === j ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-gray-100 text-gray-700'
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
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixResult.matrix.map((rowArr, i) => {
                        const atomI = graph.atoms[i];
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
                                hoveredCell?.row === i ? 'bg-blue-100 text-blue-900 font-bold' : 'text-gray-700'
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
                              const isHovered = hoveredCell?.row === i && hoveredCell?.col === j;
                              const isCrosshair = hoveredCell?.row === i || hoveredCell?.col === j;
                              const displayVal = formatCellValue(val);

                              return (
                                <td
                                  key={`cell-${i}-${j}`}
                                  onMouseEnter={() => setHoveredCell({ row: i, col: j })}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  style={{
                                    width: `${partitionSize}px`,
                                    height: `${partitionSize}px`,
                                    minWidth: `${partitionSize}px`,
                                    maxWidth: `${partitionSize}px`,
                                  }}
                                  className={`p-0 border border-gray-200 transition-colors cursor-default select-none ${
                                    isHovered
                                      ? 'bg-blue-600 text-white font-bold shadow-inner'
                                      : isBonded
                                      ? isCrosshair
                                        ? 'bg-blue-100 text-blue-900 font-bold'
                                        : 'bg-blue-50 text-blue-800 font-semibold'
                                      : isCrosshair
                                      ? 'bg-gray-100 text-gray-700'
                                      : 'text-gray-400 bg-white'
                                  }`}
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
                      Sum of all elements in current matrix
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">
                      Upper Triangle (Σ_{'{i<j}'})
                    </div>
                    <div className="text-base font-bold text-gray-900">
                      {isPlain ? matrixResult.halfSum.toString() : matrixResult.halfSum.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                      {isPlain ? 'Total bonds in molecule' : 'Half-sum of symmetric matrix'}
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
                      Sum of all topological distances (size & compactness)
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">
                      Randić Index (χ)
                    </div>
                    <div className="text-base font-bold text-purple-700">
                      {matrixResult.randicIndex.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">
                      Branching degree index: Σ 1/√(d_u · d_v)
                    </div>
                  </div>
                </div>
              </div>

              {/* Hover Inspection Breakdown */}
              {hoveredCell && (
                <div className="text-xs font-mono bg-gray-50 border border-gray-200 p-2.5 rounded-md text-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    A[{hoveredCell.row}, {hoveredCell.col}] ={' '}
                    <strong className="text-blue-700">
                      {formatCellValue(matrixResult.matrix[hoveredCell.row]?.[hoveredCell.col] ?? 0)}
                    </strong>
                  </div>
                  <div>
                    {(matrixResult.matrix[hoveredCell.row]?.[hoveredCell.col] ?? 0) > 0 ? (
                      <span className="text-green-700 font-medium">
                        Bonded: {graph.atoms[hoveredCell.row]?.symbol}
                        {hoveredCell.row} — {graph.atoms[hoveredCell.col]?.symbol}
                        {hoveredCell.col}
                        {!isPlain && ` (${activeWeightingOpt.label})`}
                      </span>
                    ) : hoveredCell.row === hoveredCell.col ? (
                      <span className="text-gray-500">Diagonal entry: 0</span>
                    ) : (
                      <span className="text-gray-500">
                        No direct bond between {graph.atoms[hoveredCell.row]?.symbol}
                        {hoveredCell.row} and {graph.atoms[hoveredCell.col]?.symbol}
                        {hoveredCell.col}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
