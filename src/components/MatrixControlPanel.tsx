/**
 * Matrix Configuration Panel: Weighting schemes, normalizations, and display options
 */

import React from 'react';
import { MatrixType, NormalizationMethod } from '../types/chem';
import { SlidersHorizontal, Layers, Activity, Palette } from 'lucide-react';

interface MatrixControlPanelProps {
  matrixType: MatrixType;
  setMatrixType: (type: MatrixType) => void;
  normalization: NormalizationMethod;
  setNormalization: (norm: NormalizationMethod) => void;
  precision: number;
  setPrecision: (p: number) => void;
  colorScheme: 'cyan' | 'amber' | 'mono' | 'spectral' | 'coolwarm';
  setColorScheme: (scheme: 'cyan' | 'amber' | 'mono' | 'spectral' | 'coolwarm') => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
}

export const MatrixControlPanel: React.FC<MatrixControlPanelProps> = ({
  matrixType,
  setMatrixType,
  normalization,
  setNormalization,
  precision,
  setPrecision,
  colorScheme,
  setColorScheme,
  showLabels,
  setShowLabels,
}) => {
  const matrixCategories = [
    {
      group: 'Standard & Bond Order',
      options: [
        { value: 'plain', label: 'Plain Binary Adjacency (A)', desc: '1 if bonded, 0 otherwise' },
        { value: 'bond_order', label: 'Bond Order Weighted (A_bo)', desc: 'Single: 1, Aromatic: 1.5, Double: 2, Triple: 3' },
        { value: 'topological_distance', label: 'Topological Distance (D)', desc: 'Shortest path distance between all atom pairs' },
      ],
    },
    {
      group: 'Electronegativity Normalization',
      options: [
        { value: 'electronegativity_diff', label: 'Pauling Δχ Polarity', desc: '|χ_i - χ_j| along bonded atoms (bond dipole)' },
        { value: 'electronegativity_prod', label: 'Pauling χ Product', desc: 'χ_i × χ_j along bonded atoms' },
        { value: 'electronegativity_diag', label: 'Vertex χ Diagonal', desc: 'A_ii = χ_i, off-diagonal = bond order' },
      ],
    },
    {
      group: 'Atomic Size / Radius',
      options: [
        { value: 'atomic_radius_sum', label: 'Covalent Radius Sum (r_i + r_j)', desc: 'Bond length proxy in picometers' },
        { value: 'atomic_radius_inv', label: 'Inverse Radius Contact (100 / Σr)', desc: 'Relative interaction contact strength' },
        { value: 'atomic_radius_diag', label: 'Vertex Radius Diagonal', desc: 'A_ii = r_cov, off-diagonal = bond order' },
      ],
    },
    {
      group: 'Atomic Number & Molecular Fields',
      options: [
        { value: 'atomic_number_prod', label: 'Atomic Number Product (Z_i × Z_j)', desc: 'Electronic core interaction weight' },
        { value: 'atomic_number_diag', label: 'Vertex Z Diagonal', desc: 'A_ii = Z_i, off-diagonal = bond order' },
        { value: 'burden_matrix', label: 'Burden / BCUT Matrix', desc: 'Diagonal = χ, off-diagonal = 0.1 × BO / √d' },
      ],
    },
    {
      group: 'Graph Laplacian Operators',
      options: [
        { value: 'laplacian', label: 'Standard Laplacian (L = D - A)', desc: 'Degree matrix minus adjacency matrix' },
        { value: 'laplacian_bo', label: 'Bond-Order Laplacian (L_bo)', desc: 'Degree_bo minus A_bo' },
      ],
    },
  ];

  const normalizations: { value: NormalizationMethod; label: string; formula: string }[] = [
    { value: 'none', label: 'None (Raw Values)', formula: 'A[i, j]' },
    { value: 'sym_degree', label: 'Symmetric Degree (GCN)', formula: 'D^(-1/2) · A · D^(-1/2)' },
    { value: 'row_stochastic', label: 'Row Stochastic (Markov)', formula: 'A[i,j] / Σ_k A[i,k] (row sum = 1)' },
    { value: 'col_stochastic', label: 'Column Stochastic', formula: 'A[i,j] / Σ_k A[k,j] (col sum = 1)' },
    { value: 'min_max', label: 'Min-Max Normalization', formula: '(x - min) / (max - min) ∈ [0, 1]' },
    { value: 'max_abs', label: 'Max-Absolute Scaling', formula: 'x / max(|x|) ∈ [-1, 1]' },
    { value: 'frobenius', label: 'Frobenius Norm', formula: 'A / ||A||_F' },
    { value: 'z_score', label: 'Standard Score (Z-Score)', formula: '(x - μ) / σ' },
    { value: 'softmax', label: 'Row-wise Softmax', formula: 'exp(x_i) / Σ exp(x_k)' },
  ];

  return (
    <div className="bg-[#0b0e17] border-b border-slate-800/80 px-6 py-3.5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Weighting Scheme */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Matrix Weighting Scheme</span>
          </label>
          <select
            value={matrixType}
            onChange={(e) => setMatrixType(e.target.value as MatrixType)}
            className="w-full bg-[#111726] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/80"
          >
            {matrixCategories.map((cat) => (
              <optgroup key={cat.group} label={cat.group} className="bg-[#07090e] text-slate-400">
                {cat.options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-slate-200 bg-[#0e1424]">
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* 2. Normalization Method */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Matrix Normalization</span>
          </label>
          <select
            value={normalization}
            onChange={(e) => setNormalization(e.target.value as NormalizationMethod)}
            className="w-full bg-[#111726] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/80"
          >
            {normalizations.map((norm) => (
              <option key={norm.value} value={norm.value} className="text-slate-200 bg-[#0e1424]">
                {norm.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Color Ramp Palette */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span>Heatmap Palette</span>
          </label>
          <div className="flex items-center gap-1 bg-[#111726] p-1 border border-slate-700 rounded-lg">
            {(['cyan', 'amber', 'mono', 'spectral', 'coolwarm'] as const).map((scheme) => (
              <button
                key={scheme}
                onClick={() => setColorScheme(scheme)}
                className={`flex-1 py-1 text-[10px] font-mono uppercase rounded transition-colors ${
                  colorScheme === scheme
                    ? 'bg-slate-800 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {scheme}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Display Precision & Toggle */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Precision: {precision} decimals</span>
            </span>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className="text-[10px] text-cyan-400 hover:underline"
            >
              Labels: {showLabels ? 'ON' : 'OFF'}
            </button>
          </label>
          <div className="flex items-center gap-2 bg-[#111726] px-3 py-1.5 border border-slate-700 rounded-lg">
            <input
              type="range"
              min={0}
              max={4}
              step={1}
              value={precision}
              onChange={(e) => setPrecision(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono text-cyan-300 w-4 text-center">{precision}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
