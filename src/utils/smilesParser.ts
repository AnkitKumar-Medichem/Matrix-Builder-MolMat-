/**
 * Robust SMILES Parser, Molecular Graph Generator, and 2D Coordinate Layout Engine
 */

import { Atom, Bond, MoleculeGraph } from '../types/chem';
import { getElementData } from './elements';

interface RingClosure {
  atomIndex: number;
  bondOrder?: number;
  isAromatic?: boolean;
}

export interface ParseOptions {
  includeHydrogens?: boolean;
}

/**
 * Parses a SMILES string into a MoleculeGraph
 */
export function parseSmiles(smilesInput: string, options: ParseOptions = {}): MoleculeGraph {
  const smiles = smilesInput.trim();
  if (!smiles) {
    throw new Error('Empty SMILES string');
  }

  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const adjacencyList = new Map<number, { target: number; order: number; isAromatic: boolean }[]>();

  const branchStack: number[] = [];
  const ringOpenings = new Map<number, RingClosure>();

  let previousAtomIndex: number | null = null;
  let pendingBondOrder: number | null = null;
  let pendingBondAromatic = false;

  let i = 0;
  const len = smiles.length;

  while (i < len) {
    const char = smiles[i];

    // Branching: open '('
    if (char === '(') {
      if (previousAtomIndex === null) {
        throw new Error(`Unexpected '(' at index ${i}: no previous atom to branch from.`);
      }
      branchStack.push(previousAtomIndex);
      i++;
      continue;
    }

    // Branching: close ')'
    if (char === ')') {
      if (branchStack.length === 0) {
        throw new Error(`Unmatched ')' at index ${i}.`);
      }
      previousAtomIndex = branchStack.pop()!;
      pendingBondOrder = null;
      pendingBondAromatic = false;
      i++;
      continue;
    }

    // Disconnected structure: '.'
    if (char === '.') {
      previousAtomIndex = null;
      pendingBondOrder = null;
      pendingBondAromatic = false;
      i++;
      continue;
    }

    // Explicit Bond specifiers
    if (char === '-') {
      pendingBondOrder = 1.0;
      pendingBondAromatic = false;
      i++;
      continue;
    }
    if (char === '=') {
      pendingBondOrder = 2.0;
      pendingBondAromatic = false;
      i++;
      continue;
    }
    if (char === '#') {
      pendingBondOrder = 3.0;
      pendingBondAromatic = false;
      i++;
      continue;
    }
    if (char === '$') {
      pendingBondOrder = 4.0;
      pendingBondAromatic = false;
      i++;
      continue;
    }
    if (char === ':') {
      pendingBondOrder = 1.5;
      pendingBondAromatic = true;
      i++;
      continue;
    }
    if (char === '/' || char === '\\') {
      // Stereochemical bond notation (directional single bond)
      pendingBondOrder = 1.0;
      pendingBondAromatic = false;
      i++;
      continue;
    }

    // Ring closure numbers: 1-9 or %10-%99
    let ringNum: number | null = null;
    let ringDigitsLen = 0;

    if (char >= '0' && char <= '9') {
      ringNum = parseInt(char, 10);
      ringDigitsLen = 1;
    } else if (char === '%') {
      if (i + 2 < len && /\d{2}/.test(smiles.substring(i + 1, i + 3))) {
        ringNum = parseInt(smiles.substring(i + 1, i + 3), 10);
        ringDigitsLen = 3;
      }
    }

    if (ringNum !== null) {
      if (previousAtomIndex === null) {
        throw new Error(`Ring closure ${ringNum} at index ${i} with no preceding atom.`);
      }

      if (!ringOpenings.has(ringNum)) {
        // Open ring
        ringOpenings.set(ringNum, {
          atomIndex: previousAtomIndex,
          bondOrder: pendingBondOrder ?? undefined,
          isAromatic: pendingBondAromatic,
        });
      } else {
        // Close ring
        const opening = ringOpenings.get(ringNum)!;
        ringOpenings.delete(ringNum);

        const atomA = opening.atomIndex;
        const atomB = previousAtomIndex;

        // Determine bond order
        let order = 1.0;
        let isAromatic = false;

        if (pendingBondOrder !== null) {
          order = pendingBondOrder;
          isAromatic = pendingBondAromatic;
        } else if (opening.bondOrder !== undefined) {
          order = opening.bondOrder;
          isAromatic = !!opening.isAromatic;
        } else if (atoms[atomA].isAromatic && atoms[atomB].isAromatic) {
          order = 1.5;
          isAromatic = true;
        }

        bonds.push({
          source: atomA,
          target: atomB,
          order,
          isAromatic,
        });

        // Add to adjacency list
        addAdj(adjacencyList, atomA, atomB, order, isAromatic);
        addAdj(adjacencyList, atomB, atomA, order, isAromatic);
      }

      pendingBondOrder = null;
      pendingBondAromatic = false;
      i += ringDigitsLen;
      continue;
    }

    // Atom: Bracketed Atom `[...]`
    if (char === '[') {
      const closeIdx = smiles.indexOf(']', i);
      if (closeIdx === -1) {
        throw new Error(`Unclosed bracket atom starting at index ${i}.`);
      }

      const bracketContent = smiles.substring(i + 1, closeIdx);
      const parsed = parseBracketAtom(bracketContent);

      const elemData = getElementData(parsed.symbol);
      const newAtomIndex = atoms.length;

      const newAtom: Atom = {
        index: newAtomIndex,
        symbol: parsed.symbol,
        atomicNumber: elemData.atomicNumber,
        isAromatic: parsed.isAromatic,
        charge: parsed.charge,
        implicitH: parsed.hCount,
        totalH: parsed.hCount,
        isotope: parsed.isotope,
        electronegativity: elemData.electronegativity,
        covalentRadius: elemData.covalentRadius,
        vdwRadius: elemData.vdwRadius,
        atomicMass: elemData.atomicMass,
        polarizability: elemData.polarizability,
        valenceElectrons: elemData.valenceElectrons,
        color: elemData.color,
        x: 0,
        y: 0,
      };

      atoms.push(newAtom);
      adjacencyList.set(newAtomIndex, []);

      if (previousAtomIndex !== null) {
        let order = pendingBondOrder ?? 1.0;
        let isAro = pendingBondAromatic;
        if (pendingBondOrder === null && atoms[previousAtomIndex].isAromatic && newAtom.isAromatic) {
          order = 1.5;
          isAro = true;
        }

        bonds.push({
          source: previousAtomIndex,
          target: newAtomIndex,
          order,
          isAromatic: isAro,
        });
        addAdj(adjacencyList, previousAtomIndex, newAtomIndex, order, isAro);
        addAdj(adjacencyList, newAtomIndex, previousAtomIndex, order, isAro);
      }

      previousAtomIndex = newAtomIndex;
      pendingBondOrder = null;
      pendingBondAromatic = false;
      i = closeIdx + 1;
      continue;
    }

    // Atom: Organic subset without brackets
    // Multi-letter organic atoms: Cl, Br
    let symbol = '';
    let isAromatic = false;

    if (char === 'C' && i + 1 < len && smiles[i + 1] === 'l') {
      symbol = 'Cl';
      i += 2;
    } else if (char === 'B' && i + 1 < len && smiles[i + 1] === 'r') {
      symbol = 'Br';
      i += 2;
    } else if (char === 'S' && i + 1 < len && smiles[i + 1] === 'i') {
      symbol = 'Si';
      i += 2;
    } else if ('BCNOFPSI'.includes(char)) {
      symbol = char;
      i += 1;
    } else if ('bcnops'.includes(char)) {
      symbol = char.toUpperCase();
      isAromatic = true;
      i += 1;
    } else {
      throw new Error(`Unrecognized character '${char}' at index ${i} in SMILES.`);
    }

    const elemData = getElementData(symbol);
    const newAtomIndex = atoms.length;

    const newAtom: Atom = {
      index: newAtomIndex,
      symbol,
      atomicNumber: elemData.atomicNumber,
      isAromatic,
      charge: 0,
      implicitH: 0, // Will be computed below
      totalH: 0,
      electronegativity: elemData.electronegativity,
      covalentRadius: elemData.covalentRadius,
      vdwRadius: elemData.vdwRadius,
      atomicMass: elemData.atomicMass,
      polarizability: elemData.polarizability,
      valenceElectrons: elemData.valenceElectrons,
      color: elemData.color,
      x: 0,
      y: 0,
    };

    atoms.push(newAtom);
    adjacencyList.set(newAtomIndex, []);

    if (previousAtomIndex !== null) {
      let order = pendingBondOrder ?? 1.0;
      let isAro = pendingBondAromatic;
      if (pendingBondOrder === null && atoms[previousAtomIndex].isAromatic && newAtom.isAromatic) {
        order = 1.5;
        isAro = true;
      }

      bonds.push({
        source: previousAtomIndex,
        target: newAtomIndex,
        order,
        isAromatic: isAro,
      });
      addAdj(adjacencyList, previousAtomIndex, newAtomIndex, order, isAro);
      addAdj(adjacencyList, newAtomIndex, previousAtomIndex, order, isAro);
    }

    previousAtomIndex = newAtomIndex;
    pendingBondOrder = null;
    pendingBondAromatic = false;
  }

  if (ringOpenings.size > 0) {
    const unclosed = Array.from(ringOpenings.keys()).join(', ');
    throw new Error(`Unclosed ring closure(s): ${unclosed}`);
  }

  // Calculate implicit hydrogens for non-bracket atoms
  for (const atom of atoms) {
    if (atom.implicitH === 0 && atom.charge === 0) {
      const neighbors = adjacencyList.get(atom.index) || [];
      const bondOrderSum = neighbors.reduce((acc, edge) => acc + edge.order, 0);

      let targetValence = 4;
      if (atom.symbol === 'C') targetValence = 4;
      else if (atom.symbol === 'N') targetValence = 3;
      else if (atom.symbol === 'O') targetValence = 2;
      else if (atom.symbol === 'F' || atom.symbol === 'Cl' || atom.symbol === 'Br' || atom.symbol === 'I') targetValence = 1;
      else if (atom.symbol === 'P') targetValence = bondOrderSum > 3 ? 5 : 3;
      else if (atom.symbol === 'S') targetValence = bondOrderSum > 4 ? 6 : bondOrderSum > 2 ? 4 : 2;
      else if (atom.symbol === 'B') targetValence = 3;

      const calcH = Math.max(0, Math.round(targetValence - bondOrderSum));
      atom.implicitH = calcH;
      atom.totalH = calcH;
    }
  }

  // Detect rings
  const detectedRings = findCycles(atoms.length, bonds);

  // If option includeHydrogens is requested, expand explicit H atoms
  let finalAtoms = atoms;
  let finalBonds = bonds;
  let finalAdj = adjacencyList;

  if (options.includeHydrogens) {
    const expanded = expandHydrogens(atoms, bonds, adjacencyList);
    finalAtoms = expanded.atoms;
    finalBonds = expanded.bonds;
    finalAdj = expanded.adjacencyList;
  }

  // Generate 2D coordinates for visual representation
  generate2DCoordinates(finalAtoms, finalBonds, detectedRings);

  // Calculate molecular formula & weight
  const formula = computeMolecularFormula(finalAtoms, options.includeHydrogens);
  const molecularWeight = finalAtoms.reduce((sum, a) => sum + a.atomicMass, 0) +
    (options.includeHydrogens ? 0 : atoms.reduce((sum, a) => sum + a.implicitH * 1.008, 0));

  return {
    smiles,
    canonicalFormula: formula,
    molecularWeight,
    atoms: finalAtoms,
    bonds: finalBonds,
    adjacencyList: finalAdj,
    isAromaticRingPresent: finalAtoms.some((a) => a.isAromatic),
    rings: detectedRings,
  };
}

function addAdj(
  adj: Map<number, { target: number; order: number; isAromatic: boolean }[]>,
  u: number,
  v: number,
  order: number,
  isAromatic: boolean
) {
  if (!adj.has(u)) adj.set(u, []);
  adj.get(u)!.push({ target: v, order, isAromatic });
}

/**
 * Parses bracketed atom like `[13C@@H]`, `[O-]`, `[NH4+]`, `[Fe+2]`
 */
function parseBracketAtom(content: string): {
  symbol: string;
  isAromatic: boolean;
  charge: number;
  hCount: number;
  isotope?: number;
} {
  let isotope: number | undefined;
  let rest = content;

  // Leading digits = isotope
  const isoMatch = rest.match(/^(\d+)/);
  if (isoMatch) {
    isotope = parseInt(isoMatch[1], 10);
    rest = rest.substring(isoMatch[1].length);
  }

  // Atom symbol: 1 or 2 letters, e.g. Cl, Na, Fe, C, c, n, o
  const symMatch = rest.match(/^([A-Z][a-z]?|[a-z])/);
  if (!symMatch) {
    throw new Error(`Invalid bracket atom symbol in [${content}]`);
  }

  let rawSym = symMatch[1];
  rest = rest.substring(rawSym.length);

  const isAromatic = rawSym.length === 1 && rawSym >= 'a' && rawSym <= 'z';
  const symbol = isAromatic ? rawSym.toUpperCase() : rawSym;

  // Chirality markers (@, @@) - ignore for topology
  rest = rest.replace(/^@{1,2}/, '');

  // Hydrogen count: H, H2, H3, etc.
  let hCount = 0;
  const hMatch = rest.match(/^H(\d*)/);
  if (hMatch) {
    hCount = hMatch[1] ? parseInt(hMatch[1], 10) : 1;
    rest = rest.substring(hMatch[0].length);
  }

  // Charge: +, -, +2, -2, ++, --, etc.
  let charge = 0;
  if (rest.includes('+') || rest.includes('-')) {
    const chargeMatch = rest.match(/([+-]+|\+\d+|-\d+)/);
    if (chargeMatch) {
      const cStr = chargeMatch[1];
      if (/^\+\d+$/.test(cStr)) {
        charge = parseInt(cStr.substring(1), 10);
      } else if (/^-\d+$/.test(cStr)) {
        charge = -parseInt(cStr.substring(1), 10);
      } else {
        const plusCount = (cStr.match(/\+/g) || []).length;
        const minusCount = (cStr.match(/-/g) || []).length;
        charge = plusCount - minusCount;
      }
    }
  }

  return { symbol, isAromatic, charge, hCount, isotope };
}

/**
 * Expands implicit hydrogens into explicit atom and bond vertices
 */
function expandHydrogens(
  atoms: Atom[],
  bonds: Bond[],
  adj: Map<number, { target: number; order: number; isAromatic: boolean }[]>
) {
  const newAtoms: Atom[] = atoms.map((a) => ({ ...a }));
  const newBonds: Bond[] = bonds.map((b) => ({ ...b }));
  const newAdj = new Map<number, { target: number; order: number; isAromatic: boolean }[]>();

  for (const [k, v] of adj.entries()) {
    newAdj.set(k, [...v]);
  }

  const hData = getElementData('H');

  for (let i = 0; i < atoms.length; i++) {
    const parentAtom = atoms[i];
    const hCount = parentAtom.implicitH;

    for (let h = 0; h < hCount; h++) {
      const hIdx = newAtoms.length;
      const hAtom: Atom = {
        index: hIdx,
        symbol: 'H',
        atomicNumber: 1,
        isAromatic: false,
        charge: 0,
        implicitH: 0,
        totalH: 0,
        electronegativity: hData.electronegativity,
        covalentRadius: hData.covalentRadius,
        vdwRadius: hData.vdwRadius,
        atomicMass: hData.atomicMass,
        polarizability: hData.polarizability,
        valenceElectrons: hData.valenceElectrons,
        color: hData.color,
        x: 0,
        y: 0,
      };

      newAtoms.push(hAtom);
      newAdj.set(hIdx, []);

      const bond: Bond = {
        source: parentAtom.index,
        target: hIdx,
        order: 1.0,
        isAromatic: false,
      };

      newBonds.push(bond);
      addAdj(newAdj, parentAtom.index, hIdx, 1.0, false);
      addAdj(newAdj, hIdx, parentAtom.index, 1.0, false);
    }
  }

  return { atoms: newAtoms, bonds: newBonds, adjacencyList: newAdj };
}

/**
 * Finds small cycles (rings) in the molecular graph using DFS cycle detection
 */
function findCycles(numAtoms: number, bonds: Bond[]): number[][] {
  const adj = Array.from({ length: numAtoms }, () => [] as number[]);
  for (const b of bonds) {
    adj[b.source].push(b.target);
    adj[b.target].push(b.source);
  }

  const cycles: number[][] = [];
  const visited = new Array(numAtoms).fill(false);
  const parent = new Array(numAtoms).fill(-1);

  function dfs(u: number, p: number, path: number[]) {
    visited[u] = true;
    parent[u] = p;
    path.push(u);

    for (const v of adj[u]) {
      if (v === p) continue;
      if (visited[v]) {
        // Cycle detected: from v to u along path
        const cycleStartIndex = path.indexOf(v);
        if (cycleStartIndex !== -1) {
          const cycle = path.slice(cycleStartIndex);
          if (cycle.length >= 3 && cycle.length <= 10) {
            // Check if cycle is already recorded
            const sortedCycleKey = [...cycle].sort((a, b) => a - b).join('-');
            const exists = cycles.some(
              (c) => [...c].sort((a, b) => a - b).join('-') === sortedCycleKey
            );
            if (!exists) {
              cycles.push(cycle);
            }
          }
        }
      } else {
        dfs(v, u, [...path]);
      }
    }
  }

  for (let i = 0; i < numAtoms; i++) {
    if (!visited[i]) {
      dfs(i, -1, []);
    }
  }

  return cycles;
}

/**
 * Computes canonical Hill system molecular formula
 */
function computeMolecularFormula(atoms: Atom[], explicitHIncluded?: boolean): string {
  const counts: Record<string, number> = {};

  for (const a of atoms) {
    counts[a.symbol] = (counts[a.symbol] || 0) + 1;
    if (!explicitHIncluded && a.implicitH > 0) {
      counts['H'] = (counts['H'] || 0) + a.implicitH;
    }
  }

  let formula = '';
  // Hill system: C first, then H, then others alphabetically
  if (counts['C']) {
    formula += `C${counts['C'] > 1 ? counts['C'] : ''}`;
    delete counts['C'];
    if (counts['H']) {
      formula += `H${counts['H'] > 1 ? counts['H'] : ''}`;
      delete counts['H'];
    }
  }

  const otherElements = Object.keys(counts).sort();
  for (const el of otherElements) {
    formula += `${el}${counts[el] > 1 ? counts[el] : ''}`;
  }

  return formula;
}

/**
 * Force-directed 2D Layout Generator (Kamada-Kawai / Fruchterman-Reingold variant)
 * Produces crisp, beautiful 2D planar layouts for chemical diagrams
 */
function generate2DCoordinates(atoms: Atom[], bonds: Bond[], rings: number[][]) {
  const n = atoms.length;
  if (n === 0) return;

  if (n === 1) {
    atoms[0].x = 200;
    atoms[0].y = 150;
    return;
  }

  if (n === 2) {
    atoms[0].x = 160;
    atoms[0].y = 150;
    atoms[1].x = 240;
    atoms[1].y = 150;
    return;
  }

  // Initial placement using BFS tree spreading with standard bond angles (60 deg / 120 deg)
  const placed = new Array(n).fill(false);
  const pos = Array.from({ length: n }, () => ({ x: 0, y: 0 }));

  const adjList = Array.from({ length: n }, () => [] as number[]);
  for (const b of bonds) {
    adjList[b.source].push(b.target);
    adjList[b.target].push(b.source);
  }

  // Find center-most atom (maximum degree)
  let root = 0;
  let maxDeg = -1;
  for (let i = 0; i < n; i++) {
    if (adjList[i].length > maxDeg) {
      maxDeg = adjList[i].length;
      root = i;
    }
  }

  // Ring-first placement: if root is in a ring, layout the ring as regular polygon
  const primaryRing = rings.find((r) => r.includes(root)) || rings[0];
  if (primaryRing && primaryRing.length >= 3) {
    const k = primaryRing.length;
    const radius = 42 / (2 * Math.sin(Math.PI / k));
    for (let idx = 0; idx < k; idx++) {
      const atomIdx = primaryRing[idx];
      const theta = (idx * 2 * Math.PI) / k - Math.PI / 2;
      pos[atomIdx].x = 200 + radius * Math.cos(theta);
      pos[atomIdx].y = 150 + radius * Math.sin(theta);
      placed[atomIdx] = true;
    }
  } else {
    pos[root] = { x: 200, y: 150 };
    placed[root] = true;
  }

  // BFS Queue to position remaining atoms
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (placed[i]) queue.push(i);
  }
  if (queue.length === 0) {
    queue.push(root);
    placed[root] = true;
    pos[root] = { x: 200, y: 150 };
  }

  const bondLen = 45;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = adjList[curr].filter((nbr) => !placed[nbr]);

    if (neighbors.length > 0) {
      // Determine angle to parent
      const parentNbrs = adjList[curr].filter((nbr) => placed[nbr]);
      let baseAngle = 0;

      if (parentNbrs.length > 0) {
        const p = parentNbrs[0];
        baseAngle = Math.atan2(pos[curr].y - pos[p].y, pos[curr].x - pos[p].x);
      }

      const spread = neighbors.length === 1 ? Math.PI / 3 : (2 * Math.PI) / (neighbors.length + 1);

      neighbors.forEach((nbr, idx) => {
        const angle = baseAngle + (idx + 1 - (neighbors.length + 1) / 2) * spread;
        pos[nbr] = {
          x: pos[curr].x + bondLen * Math.cos(angle),
          y: pos[curr].y + bondLen * Math.sin(angle),
        };
        placed[nbr] = true;
        queue.push(nbr);
      });
    }
  }

  // Place any disconnected fragments
  for (let i = 0; i < n; i++) {
    if (!placed[i]) {
      pos[i] = { x: 200 + (Math.random() - 0.5) * 100, y: 150 + (Math.random() - 0.5) * 100 };
      placed[i] = true;
    }
  }

  // Force-directed relaxation (Fruchterman-Reingold)
  const iterations = 60;
  const kIdeal = 46;
  let temp = 25;

  for (let iter = 0; iter < iterations; iter++) {
    const disp = Array.from({ length: n }, () => ({ x: 0, y: 0 }));

    // Repulsion between all atom pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) dist = 0.01;

        const force = (kIdeal * kIdeal) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        disp[i].x += fx;
        disp[i].y += fy;
        disp[j].x -= fx;
        disp[j].y -= fy;
      }
    }

    // Attraction along chemical bonds
    for (const b of bonds) {
      const i = b.source;
      const j = b.target;
      const dx = pos[i].x - pos[j].x;
      const dy = pos[i].y - pos[j].y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.01) dist = 0.01;

      const force = (dist * dist) / kIdeal;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      disp[i].x -= fx;
      disp[i].y -= fy;
      disp[j].x += fx;
      disp[j].y += fy;
    }

    // Apply displacement capped by current temperature
    for (let i = 0; i < n; i++) {
      const dLen = Math.sqrt(disp[i].x * disp[i].x + disp[i].y * disp[i].y);
      if (dLen > 0.001) {
        const step = Math.min(dLen, temp);
        pos[i].x += (disp[i].x / dLen) * step;
        pos[i].y += (disp[i].y / dLen) * step;
      }
    }

    temp *= 0.94; // Cool down
  }

  // Normalize and scale into canvas viewport (width 400, height 280, 40px margin)
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < n; i++) {
    if (pos[i].x < minX) minX = pos[i].x;
    if (pos[i].x > maxX) maxX = pos[i].x;
    if (pos[i].y < minY) minY = pos[i].y;
    if (pos[i].y > maxY) maxY = pos[i].y;
  }

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  const targetWidth = 320;
  const targetHeight = 220;
  const scale = Math.min(targetWidth / width, targetHeight / height, 1.4);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  for (let i = 0; i < n; i++) {
    atoms[i].x = Math.round(200 + (pos[i].x - centerX) * scale);
    atoms[i].y = Math.round(150 + (pos[i].y - centerY) * scale);
  }
}
