/**
 * Adjacency Matrix Computations, Chemical Weighting Schemes, Normalization Transforms,
 * and Spectral Graph Invariants.
 */

import {
  Atom,
  CellInspection,
  MatrixResult,
  MatrixType,
  MoleculeGraph,
  NormalizationMethod,
} from '../types/chem';
import { CARBON_REF } from './elements';

/**
 * Generates the raw matrix and normalized matrix for a MoleculeGraph
 */
export function calculateMatrix(
  graph: MoleculeGraph,
  matrixType: MatrixType,
  normalization: NormalizationMethod
): MatrixResult {
  const n = graph.atoms.length;
  if (n === 0) {
    return {
      matrix: [],
      rawMatrix: [],
      type: matrixType,
      normalization,
      dim: 0,
      minVal: 0,
      maxVal: 0,
      trace: 0,
      density: 0,
      sparsity: 1,
      meanVal: 0,
      matrixSum: 0,
      halfSum: 0,
      frobeniusNorm: 0,
      distanceMatrix: [],
      degrees: [],
      eigenvalues: [],
      spectralRadius: 0,
      wienerIndex: 0,
      randicIndex: 0,
      firstZagrebIndex: 0,
      secondZagrebIndex: 0,
    };
  }

  // Precompute topological shortest path distance matrix (Floyd-Warshall)
  const distanceMatrix = computeShortestPaths(graph);

  // Degrees (simple bond count)
  const degrees = graph.atoms.map((a) => {
    const edges = graph.adjacencyList.get(a.index) || [];
    return edges.length;
  });

  // Bond order degrees (sum of bond orders)
  const boDegrees = graph.atoms.map((a) => {
    const edges = graph.adjacencyList.get(a.index) || [];
    return edges.reduce((sum, e) => sum + e.order, 0);
  });

  // Build raw matrix according to matrixType
  const rawMatrix = buildRawMatrix(graph, matrixType, distanceMatrix, boDegrees);

  // Apply Normalization
  const normMatrix = applyNormalization(rawMatrix, normalization, degrees);

  // Calculate Matrix Invariants
  let minVal = Infinity;
  let maxVal = -Infinity;
  let sumVal = 0;
  let halfSum = 0;
  let sumSq = 0;
  let nonZeroCount = 0;
  let trace = 0;

  for (let i = 0; i < n; i++) {
    trace += normMatrix[i][i];
    for (let j = 0; j < n; j++) {
      const val = normMatrix[i][j];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
      sumVal += val;
      if (j > i) {
        halfSum += val;
      }
      sumSq += val * val;
      if (Math.abs(val) > 1e-6) nonZeroCount++;
    }
  }

  const totalCells = n * n;
  const density = totalCells > 0 ? (nonZeroCount / totalCells) * 100 : 0;
  const sparsity = 100 - density;
  const meanVal = totalCells > 0 ? sumVal / totalCells : 0;
  const matrixSum = sumVal;
  const frobeniusNorm = Math.sqrt(sumSq);

  // Topological graph indices (independent of normalization)
  let wienerIndex = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (distanceMatrix[i][j] < Infinity) {
        wienerIndex += distanceMatrix[i][j];
      }
    }
  }

  let randicIndex = 0;
  let firstZagrebIndex = 0;
  let secondZagrebIndex = 0;

  for (let i = 0; i < n; i++) {
    firstZagrebIndex += degrees[i] * degrees[i];
  }

  for (const b of graph.bonds) {
    const dU = degrees[b.source];
    const dV = degrees[b.target];
    if (dU > 0 && dV > 0) {
      randicIndex += 1 / Math.sqrt(dU * dV);
      secondZagrebIndex += dU * dV;
    }
  }

  // Spectral properties (eigenvalues)
  // Check if matrix is symmetric
  const isSymmetric = checkSymmetry(normMatrix);
  let eigenvalues: number[] = [];
  if (isSymmetric) {
    eigenvalues = computeSymmetricEigenvalues(normMatrix);
  } else {
    eigenvalues = computeApproxEigenvalues(normMatrix);
  }

  eigenvalues.sort((a, b) => b - a);

  const spectralRadius = eigenvalues.length > 0 ? Math.max(...eigenvalues.map((ev) => Math.abs(ev))) : 0;
  const spectralGap = eigenvalues.length >= 2 ? eigenvalues[0] - eigenvalues[1] : 0;

  // For Laplacian, algebraic connectivity is the second smallest eigenvalue (index n-2 in descending order)
  let algebraicConnectivity: number | undefined;
  if (matrixType === 'laplacian' || matrixType === 'laplacian_bo') {
    if (eigenvalues.length >= 2) {
      // Smallest is ~0, second smallest is eigenvalues[eigenvalues.length - 2]
      algebraicConnectivity = Math.max(0, eigenvalues[eigenvalues.length - 2]);
    }
  }

  return {
    matrix: normMatrix,
    rawMatrix,
    type: matrixType,
    normalization,
    dim: n,
    minVal: isFinite(minVal) ? minVal : 0,
    maxVal: isFinite(maxVal) ? maxVal : 0,
    trace,
    density,
    sparsity,
    meanVal,
    matrixSum,
    halfSum,
    frobeniusNorm,
    distanceMatrix,
    degrees,
    eigenvalues,
    spectralRadius,
    spectralGap,
    algebraicConnectivity,
    wienerIndex,
    randicIndex,
    firstZagrebIndex,
    secondZagrebIndex,
  };
}

/**
 * Builds unnormalized raw matrix according to chemistry weighting scheme
 */
function buildRawMatrix(
  graph: MoleculeGraph,
  matrixType: MatrixType,
  distanceMatrix: number[][],
  boDegrees: number[]
): number[][] {
  const n = graph.atoms.length;
  const M: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  // Map bond edges for fast lookup
  const bondMap = new Map<string, { order: number; isAromatic: boolean }>();
  for (const b of graph.bonds) {
    const key1 = `${b.source}-${b.target}`;
    const key2 = `${b.target}-${b.source}`;
    bondMap.set(key1, { order: b.order, isAromatic: b.isAromatic });
    bondMap.set(key2, { order: b.order, isAromatic: b.isAromatic });
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const atomI = graph.atoms[i];
      const atomJ = graph.atoms[j];
      const bond = bondMap.get(`${i}-${j}`);
      const isBonded = bond !== undefined;
      const bondOrder = bond ? bond.order : 0;

      if (i === j) {
        // Diagonal handling
        switch (matrixType) {
          case 'plain':
          case 'bond_order':
          case 'covalent_radius_rel_carbon':
          case 'vdw_radius_rel_carbon':
          case 'atomic_mass_rel_carbon':
          case 'electronegativity_rel_carbon':
          case 'polarizability_rel_carbon':
          case 'electronegativity_diff':
          case 'electronegativity_prod':
          case 'atomic_radius_sum':
          case 'atomic_radius_inv':
          case 'atomic_number_prod':
          case 'topological_distance':
            M[i][i] = 0;
            break;
          case 'electronegativity_diag':
            M[i][i] = atomI.electronegativity;
            break;
          case 'atomic_radius_diag':
            M[i][i] = atomI.covalentRadius;
            break;
          case 'atomic_number_diag':
            M[i][i] = atomI.atomicNumber;
            break;
          case 'burden_matrix':
            // Diagonal is electronegativity scaled
            M[i][i] = atomI.electronegativity;
            break;
          case 'laplacian':
            M[i][i] = (graph.adjacencyList.get(i) || []).length;
            break;
          case 'laplacian_bo':
            M[i][i] = boDegrees[i];
            break;
        }
      } else {
        // Off-diagonal handling
        switch (matrixType) {
          case 'plain':
            M[i][j] = isBonded ? 1 : 0;
            break;
          case 'bond_order':
            M[i][j] = bondOrder;
            break;
          case 'covalent_radius_rel_carbon':
            // Covalent radius relative to carbon: ((r_i + r_j)/2) / r_cov(C) for bonded pair
            M[i][j] = isBonded ? ((atomI.covalentRadius + atomJ.covalentRadius) / 2) / CARBON_REF.covalentRadius : 0;
            break;
          case 'vdw_radius_rel_carbon':
            // Van der Waals radius relative to carbon: ((vdw_i + vdw_j)/2) / vdw(C)
            M[i][j] = isBonded ? ((atomI.vdwRadius + atomJ.vdwRadius) / 2) / CARBON_REF.vdwRadius : 0;
            break;
          case 'atomic_mass_rel_carbon':
            // Atomic mass relative to carbon: ((mass_i + mass_j)/2) / mass(C)
            M[i][j] = isBonded ? ((atomI.atomicMass + atomJ.atomicMass) / 2) / CARBON_REF.atomicMass : 0;
            break;
          case 'electronegativity_rel_carbon':
            // Pauling electronegativity relative to carbon: ((chi_i + chi_j)/2) / chi(C)
            M[i][j] = isBonded ? ((atomI.electronegativity + atomJ.electronegativity) / 2) / CARBON_REF.electronegativity : 0;
            break;
          case 'polarizability_rel_carbon':
            // Polarizability relative to carbon: ((alpha_i + alpha_j)/2) / alpha(C)
            M[i][j] = isBonded ? ((atomI.polarizability + atomJ.polarizability) / 2) / CARBON_REF.polarizability : 0;
            break;
          case 'electronegativity_diff':
            // Edge polarity / ionic character |chi_i - chi_j|
            M[i][j] = isBonded ? Math.abs(atomI.electronegativity - atomJ.electronegativity) : 0;
            break;
          case 'electronegativity_prod':
            M[i][j] = isBonded ? atomI.electronegativity * atomJ.electronegativity : 0;
            break;
          case 'electronegativity_diag':
            M[i][j] = bondOrder;
            break;
          case 'atomic_radius_sum':
            M[i][j] = isBonded ? atomI.covalentRadius + atomJ.covalentRadius : 0;
            break;
          case 'atomic_radius_inv':
            // Contact strength 100 / (r_i + r_j)
            M[i][j] = isBonded ? 100 / (atomI.covalentRadius + atomJ.covalentRadius) : 0;
            break;
          case 'atomic_radius_diag':
            M[i][j] = bondOrder;
            break;
          case 'atomic_number_prod':
            M[i][j] = isBonded ? atomI.atomicNumber * atomJ.atomicNumber : 0;
            break;
          case 'atomic_number_diag':
            M[i][j] = bondOrder;
            break;
          case 'topological_distance':
            M[i][j] = distanceMatrix[i][j] === Infinity ? 0 : distanceMatrix[i][j];
            break;
          case 'burden_matrix': {
            const d = distanceMatrix[i][j];
            if (isBonded) {
              M[i][j] = 0.1 * bondOrder;
            } else if (d > 0 && d < Infinity) {
              M[i][j] = 0.001 / (d * d);
            } else {
              M[i][j] = 0;
            }
            break;
          }
          case 'laplacian':
            M[i][j] = isBonded ? -1 : 0;
            break;
          case 'laplacian_bo':
            M[i][j] = isBonded ? -bondOrder : 0;
            break;
        }
      }
    }
  }

  return M;
}

/**
 * Applies mathematical normalization transforms to the matrix
 */
function applyNormalization(
  raw: number[][],
  norm: NormalizationMethod,
  degrees: number[]
): number[][] {
  const n = raw.length;
  const result: number[][] = Array.from({ length: n }, (_, r) => [...raw[r]]);

  if (norm === 'none') {
    return result;
  }

  if (norm === 'sym_degree') {
    // D^(-1/2) * A * D^(-1/2) (Symmetric Normalized / GCN)
    // Row/col degree = sum of absolute weights or simple node degrees
    const rowSums = raw.map((row) => row.reduce((sum, val) => sum + Math.abs(val), 0));
    const dInvSqrt = rowSums.map((d) => (d > 1e-9 ? 1 / Math.sqrt(d) : 0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i][j] = raw[i][j] * dInvSqrt[i] * dInvSqrt[j];
      }
    }
    return result;
  }

  if (norm === 'row_stochastic') {
    // Each row sums to 1.0 (Markov transition matrix)
    for (let i = 0; i < n; i++) {
      const rowSum = raw[i].reduce((sum, val) => sum + Math.abs(val), 0);
      for (let j = 0; j < n; j++) {
        result[i][j] = rowSum > 1e-9 ? raw[i][j] / rowSum : 0;
      }
    }
    return result;
  }

  if (norm === 'col_stochastic') {
    // Each column sums to 1.0
    for (let j = 0; j < n; j++) {
      let colSum = 0;
      for (let i = 0; i < n; i++) {
        colSum += Math.abs(raw[i][j]);
      }
      for (let i = 0; i < n; i++) {
        result[i][j] = colSum > 1e-9 ? raw[i][j] / colSum : 0;
      }
    }
    return result;
  }

  if (norm === 'min_max') {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (raw[i][j] < min) min = raw[i][j];
        if (raw[i][j] > max) max = raw[i][j];
      }
    }
    const range = max - min;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i][j] = range > 1e-9 ? (raw[i][j] - min) / range : 0;
      }
    }
    return result;
  }

  if (norm === 'max_abs') {
    let maxAbs = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const absVal = Math.abs(raw[i][j]);
        if (absVal > maxAbs) maxAbs = absVal;
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i][j] = maxAbs > 1e-9 ? raw[i][j] / maxAbs : 0;
      }
    }
    return result;
  }

  if (norm === 'frobenius') {
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumSq += raw[i][j] * raw[i][j];
      }
    }
    const frob = Math.sqrt(sumSq);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i][j] = frob > 1e-9 ? raw[i][j] / frob : 0;
      }
    }
    return result;
  }

  if (norm === 'z_score') {
    let sum = 0;
    const total = n * n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sum += raw[i][j];
      }
    }
    const mean = sum / total;
    let varSum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const diff = raw[i][j] - mean;
        varSum += diff * diff;
      }
    }
    const std = Math.sqrt(varSum / total);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i][j] = std > 1e-9 ? (raw[i][j] - mean) / std : 0;
      }
    }
    return result;
  }

  if (norm === 'softmax') {
    for (let i = 0; i < n; i++) {
      const row = raw[i];
      const maxInRow = Math.max(...row);
      const exps = row.map((v) => Math.exp(v - maxInRow));
      const sumExp = exps.reduce((s, v) => s + v, 0);
      for (let j = 0; j < n; j++) {
        result[i][j] = sumExp > 1e-9 ? exps[j] / sumExp : 1 / n;
      }
    }
    return result;
  }

  return result;
}

/**
 * Floyd-Warshall shortest path algorithm
 */
function computeShortestPaths(graph: MoleculeGraph): number[][] {
  const n = graph.atoms.length;
  const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));

  for (let i = 0; i < n; i++) dist[i][i] = 0;

  for (const b of graph.bonds) {
    dist[b.source][b.target] = 1;
    dist[b.target][b.source] = 1;
  }

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }

  return dist;
}

/**
 * Checks if matrix is symmetric within numerical tolerance
 */
function checkSymmetry(A: number[][]): boolean {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[i][j] - A[j][i]) > 1e-6) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Computes all eigenvalues of a real symmetric matrix using Jacobi eigenvalue algorithm
 */
function computeSymmetricEigenvalues(A: number[][]): number[] {
  const n = A.length;
  if (n === 0) return [];
  if (n === 1) return [A[0][0]];

  // Make a clone of A
  const M: number[][] = A.map((row) => [...row]);
  const maxSweeps = 50;

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    // Find largest off-diagonal element
    let maxOff = 0;
    let p = 0;
    let q = 1;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const off = Math.abs(M[i][j]);
        if (off > maxOff) {
          maxOff = off;
          p = i;
          q = j;
        }
      }
    }

    if (maxOff < 1e-10) break; // Convergence achieved

    const diff = M[q][q] - M[p][p];
    let t: number;
    if (Math.abs(M[p][q]) < Math.abs(diff) * 1e-15) {
      t = M[p][q] / diff;
    } else {
      const phi = diff / (2 * M[p][q]);
      t = 1 / (Math.abs(phi) + Math.sqrt(phi * phi + 1));
      if (phi < 0) t = -t;
    }

    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;
    const tau = s / (1 + c);

    const mPq = M[p][q];
    M[p][q] = 0;
    M[q][p] = 0;
    M[p][p] -= t * mPq;
    M[q][q] += t * mPq;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const mip = M[i][p];
        const miq = M[i][q];
        M[i][p] = mip - s * (miq + tau * mip);
        M[p][i] = M[i][p];
        M[i][q] = miq + s * (mip - tau * miq);
        M[q][i] = M[i][q];
      }
    }
  }

  const eigenvalues = [];
  for (let i = 0; i < n; i++) {
    eigenvalues.push(M[i][i]);
  }
  return eigenvalues;
}

/**
 * Approximate eigenvalues via Gershgorin circle centers / diagonal fallback for non-symmetric matrices
 */
function computeApproxEigenvalues(A: number[][]): number[] {
  const n = A.length;
  // Return diagonal elements or row sums as proxy
  return A.map((row, i) => row[i]);
}

/**
 * Builds detailed cell inspector breakdown
 */
export function inspectCell(
  matrixResult: MatrixResult,
  graph: MoleculeGraph,
  row: number,
  col: number
): CellInspection {
  const atomRow = graph.atoms[row];
  const atomCol = graph.atoms[col];

  // Check bond
  const bond = graph.bonds.find(
    (b) => (b.source === row && b.target === col) || (b.source === col && b.target === row)
  );
  const isBonded = bond !== undefined;
  const bondOrder = bond ? bond.order : 0;
  const distance = matrixResult.distanceMatrix[row]?.[col] ?? 0;
  const rawValue = matrixResult.rawMatrix[row]?.[col] ?? 0;
  const normalizedValue = matrixResult.matrix[row]?.[col] ?? 0;

  let formulaDescription = '';
  const calculationSteps: string[] = [];

  const type = matrixResult.type;
  const norm = matrixResult.normalization;

  // Step 1: Raw definition
  if (row === col) {
    calculationSteps.push(`Diagonal entry for Atom ${row} (${atomRow.symbol}${row})`);
    switch (type) {
      case 'plain':
      case 'bond_order':
      case 'electronegativity_diff':
      case 'electronegativity_prod':
      case 'atomic_radius_sum':
      case 'atomic_radius_inv':
      case 'atomic_number_prod':
      case 'topological_distance':
        formulaDescription = `A[${row}, ${col}] = 0 (Standard zero diagonal)`;
        calculationSteps.push('Raw value is 0 on the diagonal.');
        break;
      case 'electronegativity_diag':
        formulaDescription = `A[${row}, ${col}] = \\chi(${atomRow.symbol}) = ${atomRow.electronegativity}`;
        calculationSteps.push(`Pauling electronegativity of ${atomRow.symbol} = ${atomRow.electronegativity}`);
        break;
      case 'atomic_radius_diag':
        formulaDescription = `A[${row}, ${col}] = r_{cov}(${atomRow.symbol}) = ${atomRow.covalentRadius} pm`;
        calculationSteps.push(`Covalent radius of ${atomRow.symbol} = ${atomRow.covalentRadius} pm`);
        break;
      case 'atomic_number_diag':
        formulaDescription = `A[${row}, ${col}] = Z(${atomRow.symbol}) = ${atomRow.atomicNumber}`;
        calculationSteps.push(`Atomic number of ${atomRow.symbol} = ${atomRow.atomicNumber}`);
        break;
      case 'laplacian':
        formulaDescription = `L[${row}, ${col}] = Degree = ${matrixResult.degrees[row]}`;
        calculationSteps.push(`Degree of atom ${atomRow.symbol}${row} is ${matrixResult.degrees[row]}`);
        break;
      case 'laplacian_bo':
        formulaDescription = `L_{BO}[${row}, ${col}] = \\sum \\text{BondOrders} = ${rawValue}`;
        calculationSteps.push(`Sum of bond orders connected to ${atomRow.symbol}${row} = ${rawValue}`);
        break;
      case 'burden_matrix':
        formulaDescription = `B[${row}, ${col}] = \\chi(${atomRow.symbol}) = ${atomRow.electronegativity}`;
        calculationSteps.push(`Burden diagonal: electronegativity = ${atomRow.electronegativity}`);
        break;
    }
  } else {
    calculationSteps.push(`Pair between Atom ${row} (${atomRow.symbol}) and Atom ${col} (${atomCol.symbol})`);
    calculationSteps.push(`Bonded: ${isBonded ? `Yes (order ${bondOrder})` : 'No'}, Topological distance: ${distance} bonds`);

    switch (type) {
      case 'plain':
        formulaDescription = `A[${row}, ${col}] = ${isBonded ? '1 (bonded)' : '0 (not bonded)'}`;
        break;
      case 'bond_order':
        formulaDescription = `A[${row}, ${col}] = BondOrder = ${bondOrder}`;
        break;
      case 'covalent_radius_rel_carbon':
        formulaDescription = isBonded
          ? `r_cov(pair)/r_cov(C) = [(${atomRow.covalentRadius} + ${atomCol.covalentRadius})/2] / ${CARBON_REF.covalentRadius} = ${rawValue.toFixed(3)}`
          : '0 (not bonded)';
        break;
      case 'vdw_radius_rel_carbon':
        formulaDescription = isBonded
          ? `r_vdw(pair)/r_vdw(C) = [(${atomRow.vdwRadius} + ${atomCol.vdwRadius})/2] / ${CARBON_REF.vdwRadius} = ${rawValue.toFixed(3)}`
          : '0 (not bonded)';
        break;
      case 'atomic_mass_rel_carbon':
        formulaDescription = isBonded
          ? `mass(pair)/mass(C) = [(${atomRow.atomicMass} + ${atomCol.atomicMass})/2] / ${CARBON_REF.atomicMass} = ${rawValue.toFixed(3)}`
          : '0 (not bonded)';
        break;
      case 'electronegativity_rel_carbon':
        formulaDescription = isBonded
          ? `χ(pair)/χ(C) = [(${atomRow.electronegativity} + ${atomCol.electronegativity})/2] / ${CARBON_REF.electronegativity} = ${rawValue.toFixed(3)}`
          : '0 (not bonded)';
        break;
      case 'polarizability_rel_carbon':
        formulaDescription = isBonded
          ? `α(pair)/α(C) = [(${atomRow.polarizability} + ${atomCol.polarizability})/2] / ${CARBON_REF.polarizability} = ${rawValue.toFixed(3)}`
          : '0 (not bonded)';
        break;
      case 'electronegativity_diff':
        formulaDescription = isBonded
          ? `|\\chi(${atomRow.symbol}) - \\chi(${atomCol.symbol})| = |${atomRow.electronegativity} - ${atomCol.electronegativity}| = ${rawValue.toFixed(3)}`
          : '0 (atoms are not bonded)';
        break;
      case 'electronegativity_prod':
        formulaDescription = isBonded
          ? `\\chi(${atomRow.symbol}) \\times \\chi(${atomCol.symbol}) = ${atomRow.electronegativity} \\times ${atomCol.electronegativity} = ${rawValue.toFixed(3)}`
          : '0 (atoms are not bonded)';
        break;
      case 'electronegativity_diag':
      case 'atomic_radius_diag':
      case 'atomic_number_diag':
        formulaDescription = `A[${row}, ${col}] = BondOrder = ${bondOrder}`;
        break;
      case 'atomic_radius_sum':
        formulaDescription = isBonded
          ? `r(${atomRow.symbol}) + r(${atomCol.symbol}) = ${atomRow.covalentRadius} + ${atomCol.covalentRadius} = ${rawValue} pm`
          : '0 (atoms are not bonded)';
        break;
      case 'atomic_radius_inv':
        formulaDescription = isBonded
          ? `100 / (${atomRow.covalentRadius} + ${atomCol.covalentRadius}) = 100 / ${atomRow.covalentRadius + atomCol.covalentRadius} = ${rawValue.toFixed(4)}`
          : '0 (atoms are not bonded)';
        break;
      case 'atomic_number_prod':
        formulaDescription = isBonded
          ? `Z(${atomRow.symbol}) \\times Z(${atomCol.symbol}) = ${atomRow.atomicNumber} \\times ${atomCol.atomicNumber} = ${rawValue}`
          : '0 (atoms are not bonded)';
        break;
      case 'topological_distance':
        formulaDescription = `d(${row}, ${col}) = ${distance} bonds`;
        break;
      case 'burden_matrix':
        formulaDescription = isBonded
          ? `0.1 \\times \\text{BondOrder} = 0.1 \\times ${bondOrder} = ${rawValue}`
          : `0.001 / d^2 = 0.001 / ${distance * distance} = ${rawValue.toFixed(6)}`;
        break;
      case 'laplacian':
        formulaDescription = isBonded ? `-1 (negative adjacency)` : '0';
        break;
      case 'laplacian_bo':
        formulaDescription = isBonded ? `-${bondOrder} (negative bond order)` : '0';
        break;
    }
  }

  // Step 2: Normalization breakdown
  if (norm !== 'none') {
    switch (norm) {
      case 'sym_degree':
        calculationSteps.push(`Normalized: A'[i,j] = A[i,j] / sqrt(d_i * d_j)`);
        calculationSteps.push(`Formula: ${rawValue.toFixed(4)} / sqrt(${matrixResult.rawMatrix[row].reduce((a, b) => a + Math.abs(b), 0).toFixed(2)} * ${matrixResult.rawMatrix[col].reduce((a, b) => a + Math.abs(b), 0).toFixed(2)}) = ${normalizedValue.toFixed(4)}`);
        break;
      case 'row_stochastic':
        calculationSteps.push(`Normalized: A'[i,j] = A[i,j] / RowSum(i)`);
        break;
      case 'col_stochastic':
        calculationSteps.push(`Normalized: A'[i,j] = A[i,j] / ColSum(j)`);
        break;
      case 'min_max':
        calculationSteps.push(`Min-Max Scaled: (val - min) / (max - min)`);
        calculationSteps.push(`(${rawValue.toFixed(3)} - ${matrixResult.minVal.toFixed(3)}) / ${(matrixResult.maxVal - matrixResult.minVal).toFixed(3)} = ${normalizedValue.toFixed(4)}`);
        break;
      case 'max_abs':
        calculationSteps.push(`Max Absolute Scaled: val / max(|val|)`);
        break;
      case 'frobenius':
        calculationSteps.push(`Frobenius Scaled: val / ||A||_F`);
        calculationSteps.push(`${rawValue.toFixed(4)} / ${matrixResult.frobeniusNorm.toFixed(4)} = ${normalizedValue.toFixed(4)}`);
        break;
      case 'z_score':
        calculationSteps.push(`Z-Score: (val - mean) / std_dev`);
        break;
      case 'softmax':
        calculationSteps.push(`Softmax applied along row ${row}`);
        break;
    }
  }

  return {
    row,
    col,
    atomRow,
    atomCol,
    isBonded,
    bondOrder,
    distance,
    rawValue,
    normalizedValue,
    formulaDescription,
    calculationSteps,
  };
}
