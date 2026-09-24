/**
 * Molecular Graph & Matrix Types
 */

export interface ElementData {
  symbol: string;
  name: string;
  atomicNumber: number;
  electronegativity: number; // Pauling scale (0 if unknown/noble)
  covalentRadius: number; // in picometers (pm)
  vdwRadius: number; // van der Waals radius in pm
  atomicMass: number; // in Da / u
  polarizability: number; // atomic polarizability in 10^-24 cm^3 (Angstrom^3)
  valenceElectrons: number;
  standardValence: number[];
  color: string; // CPK hex color
}

export interface Atom {
  index: number; // 0-based index in the graph
  symbol: string;
  atomicNumber: number;
  isAromatic: boolean;
  charge: number; // formal charge: +1, -1, 0, etc.
  implicitH: number; // number of implicit hydrogens
  totalH: number;
  isotope?: number;
  x: number; // 2D layout x coordinate
  y: number; // 2D layout y coordinate
  color: string; // CPK color
  // Chemical descriptors
  electronegativity: number;
  covalentRadius: number; // pm
  vdwRadius: number; // pm
  atomicMass: number;
  polarizability: number; // Angstrom^3
  valenceElectrons: number;
}

export interface Bond {
  source: number; // atom index
  target: number; // atom index
  order: number; // 1.0 (single), 1.5 (aromatic), 2.0 (double), 3.0 (triple), 4.0 (quadruple)
  isAromatic: boolean;
  stereo?: 'none' | 'up' | 'down' | 'cis' | 'trans';
}

export interface MoleculeGraph {
  smiles: string;
  canonicalFormula: string;
  molecularWeight: number;
  atoms: Atom[];
  bonds: Bond[];
  adjacencyList: Map<number, { target: number; order: number; isAromatic: boolean }[]>;
  isAromaticRingPresent: boolean;
  rings: number[][]; // list of atom indices in each detected ring
}

export type MatrixType =
  | 'plain' // Binary adjacency matrix (0 or 1)
  | 'bond_order' // Bond Order: 1 (single), 1.5 (aromatic), 2 (double), 3 (triple)
  | 'covalent_radius_rel_carbon' // Covalent radius relative to carbon: r_cov / r_cov(C) on bonded edges
  | 'vdw_radius_rel_carbon' // Van der Waals radius relative to carbon: r_vdw / r_vdw(C) on bonded edges
  | 'atomic_mass_rel_carbon' // Atomic mass relative to carbon: mass / mass(C) on bonded edges
  | 'electronegativity_rel_carbon' // Pauling electronegativity relative to carbon: chi / chi(C) on bonded edges
  | 'polarizability_rel_carbon' // Polarizability relative to carbon: alpha / alpha(C) on bonded edges
  | 'electronegativity_diff' // |chi_i - chi_j| on edges, 0 on diagonal
  | 'electronegativity_prod' // chi_i * chi_j on edges
  | 'electronegativity_diag' // Diagonal chi_i, bond order on edges
  | 'atomic_radius_sum' // Covalent radius sum (r_i + r_j) on edges
  | 'atomic_radius_inv' // 1 / (r_i + r_j) on edges (contact strength)
  | 'atomic_radius_diag' // Diagonal r_i (pm), bond order on edges
  | 'atomic_number_prod' // Z_i * Z_j on edges
  | 'atomic_number_diag' // Diagonal Z_i, bond order on edges
  | 'topological_distance' // Shortest path distance d(i,j) in bonds
  | 'burden_matrix' // Burden/BCUT matrix (diag: property, off-diag: 0.1 * bond_order / sqrt(d_ij))
  | 'laplacian' // L = D - A (Standard degree Laplacian)
  | 'laplacian_bo'; // L_BO = D_BO - A_BO (Bond-order weighted Laplacian)

export type NormalizationMethod =
  | 'none' // Raw values
  | 'sym_degree' // D^(-1/2) * A * D^(-1/2) (Symmetric Normalized / GCN)
  | 'row_stochastic' // D^(-1) * A (Row sum = 1, Markov walk)
  | 'col_stochastic' // Column sum = 1
  | 'min_max' // (x - min) / (max - min) into [0, 1]
  | 'max_abs' // x / max(|x|)
  | 'frobenius' // A / ||A||_F
  | 'z_score' // (x - mean) / std_dev
  | 'softmax'; // Softmax along rows

export interface MatrixResult {
  matrix: number[][];
  rawMatrix: number[][];
  type: MatrixType;
  normalization: NormalizationMethod;
  dim: number;
  minVal: number;
  maxVal: number;
  trace: number;
  density: number; // percentage of non-zero entries
  sparsity: number;
  meanVal: number;
  matrixSum: number; // Sum of all elements in the plotted matrix
  halfSum: number; // Sum of upper triangle elements (sum_i<j M_ij)
  frobeniusNorm: number;
  distanceMatrix: number[][];
  degrees: number[];
  eigenvalues: number[];
  spectralRadius: number;
  spectralGap?: number;
  algebraicConnectivity?: number; // 2nd smallest eigenvalue of Laplacian
  wienerIndex: number;
  randicIndex: number;
  firstZagrebIndex: number;
  secondZagrebIndex: number;
}

export interface CellInspection {
  row: number;
  col: number;
  atomRow: Atom;
  atomCol: Atom;
  isBonded: boolean;
  bondOrder: number;
  distance: number;
  rawValue: number;
  normalizedValue: number;
  formulaDescription: string;
  calculationSteps: string[];
}
