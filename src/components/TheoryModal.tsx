/**
 * Mathematical Formulations and Chemical Normalization Reference Guide
 */

import React from 'react';
import { BookOpen, Sparkles, Sigma, Atom, Network } from 'lucide-react';

export const TheoryModal: React.FC = () => {
  return (
    <div className="w-full h-full overflow-y-auto p-8 max-w-5xl mx-auto space-y-8 text-slate-300 font-sans">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <span>Molecular Graph Adjacency Matrices & Normalization Theory</span>
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Mathematical foundations of chemical graph theory, spectral analysis, and atomic weighting schemes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* 1. Plain & Bond Order */}
        <div className="bg-[#0e1322] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
            <Network className="w-4 h-4 text-cyan-400" />
            <h3>1. Binary & Bond Order Adjacency Matrices</h3>
          </div>
          <p className="text-slate-400 leading-relaxed">
            In standard chemical graph theory, atoms are vertices V and covalent bonds are edges E. The plain adjacency matrix A is defined as:
          </p>
          <div className="bg-[#07090e] p-3 rounded-lg border border-slate-800 font-mono text-cyan-200">
            {"A[i, j] = 1 if (i, j) ∈ E,   A[i, i] = 0"}
          </div>
          <p className="text-slate-400 leading-relaxed">
            In the bond-order weighted matrix A_BO, bond multiplicity is explicitly encoded: single bonds = 1.0, aromatic bonds = 1.5, double bonds = 2.0, and triple bonds = 3.0.
          </p>
        </div>

        {/* 2. Electronegativity Normalization */}
        <div className="bg-[#0e1322] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
            <Atom className="w-4 h-4 text-cyan-400" />
            <h3>2. Pauling Electronegativity Normalization</h3>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Pauling electronegativity χ governs electron density distribution and bond polarity:
          </p>
          <div className="bg-[#07090e] p-3 rounded-lg border border-slate-800 font-mono text-cyan-200 space-y-1">
            <div>{"Difference (Polarity): A[i, j] = |χ_i - χ_j|"}</div>
            <div>{"Product: A[i, j] = χ_i · χ_j"}</div>
            <div>{"Vertex Diagonal: A[i, i] = χ_i,   A[i, j] = BO[i, j]"}</div>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Bond difference weighting emphasizes polar bonds (e.g. C=O, C-F) over non-polar covalent bonds (e.g. C-C).
          </p>
        </div>

        {/* 3. Atomic Size & Radius Normalization */}
        <div className="bg-[#0e1322] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
            <Sigma className="w-4 h-4 text-cyan-400" />
            <h3>3. Atomic Radius & Size Normalization</h3>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Incorporates covalent radii r_cov (in picometers) as a proxy for equilibrium bond lengths and steric hindrance:
          </p>
          <div className="bg-[#07090e] p-3 rounded-lg border border-slate-800 font-mono text-cyan-200 space-y-1">
            <div>{"Sum: A[i, j] = r_i + r_j (ideal bond length in pm)"}</div>
            <div>{"Inverse Contact: A[i, j] = 100 / (r_i + r_j)"}</div>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Smaller atoms (e.g. H, C, N, O) have higher orbital overlap and tighter contact values than bulky halogens or metals.
          </p>
        </div>

        {/* 4. Graph Laplacian & Burden Matrix */}
        <div className="bg-[#0e1322] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3>4. Graph Laplacian & Burden Matrix</h3>
          </div>
          <p className="text-slate-400 leading-relaxed">
            The standard Graph Laplacian L = D - A has zero row sums and represents diffusion across the molecular backbone:
          </p>
          <div className="bg-[#07090e] p-3 rounded-lg border border-slate-800 font-mono text-cyan-200 space-y-1">
            <div>{"L[i, i] = deg(i),   L[i, j] = -A[i, j]"}</div>
            <div>{"Burden Matrix: B[i, i] = χ_i,   B[i, j] = 0.1 · BO[i, j] / √d(i, j)"}</div>
          </div>
          <p className="text-slate-400 leading-relaxed">
            The second smallest eigenvalue λ_2(L) is the algebraic connectivity (Fiedler value), quantifying molecular graph robustness against fragmentation.
          </p>
        </div>
      </div>

      {/* Normalization Matrix Transforms */}
      <div className="bg-[#0e1322] border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h3 className="text-sm font-semibold text-white">
          Matrix Normalization Transformations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#07090e] p-3 rounded-lg border border-slate-800">
            <span className="text-cyan-300 font-semibold block mb-1 font-mono">Symmetric Degree (GCN)</span>
            <code className="text-[11px] text-slate-300 font-mono block">
              {"A' = D^(-1/2) · A · D^(-1/2)"}
            </code>
            <p className="text-[11px] text-slate-400 mt-2">
              Standard normalization in Spectral Graph Theory and Graph Neural Networks to balance high-degree central nodes with peripheral atoms.
            </p>
          </div>

          <div className="bg-[#07090e] p-3 rounded-lg border border-slate-800">
            <span className="text-cyan-300 font-semibold block mb-1 font-mono">Row Stochastic (Markov)</span>
            <code className="text-[11px] text-slate-300 font-mono block">
              {"A'[i, j] = A[i, j] / Σ_k A[i, k]"}
            </code>
            <p className="text-[11px] text-slate-400 mt-2">
              Every row sums to 1.0, representing transition probabilities of a random walk across bonds in the molecule.
            </p>
          </div>

          <div className="bg-[#07090e] p-3 rounded-lg border border-slate-800">
            <span className="text-cyan-300 font-semibold block mb-1 font-mono">Frobenius L2 Norm</span>
            <code className="text-[11px] text-slate-300 font-mono block">
              {"A' = A / ||A||_F"}
            </code>
            <p className="text-[11px] text-slate-400 mt-2">
              Scales the entire matrix by its Euclidean Frobenius norm such that the sum of squared elements equals 1.0.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
