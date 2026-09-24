/**
 * Curated Molecular SMILES Presets across Organic, Medicinal, Biochemical, and Polycyclic systems.
 */

export interface MoleculePreset {
  id: string;
  name: string;
  formulaName: string;
  smiles: string;
  category: 'Pharmaceuticals' | 'Aromatics & Rings' | 'Biomolecules' | 'Common Organics' | 'Inorganic / Ions';
  description: string;
}

export const PRESETS: MoleculePreset[] = [
  {
    id: 'aspirin',
    name: 'Aspirin',
    formulaName: 'Acetylsalicylic acid',
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    category: 'Pharmaceuticals',
    description: 'Analgesic and anti-inflammatory drug; contains aromatic ring, ester, and carboxylic acid.',
  },
  {
    id: 'caffeine',
    name: 'Caffeine',
    formulaName: '1,3,7-Trimethylxanthine',
    smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
    category: 'Pharmaceuticals',
    description: 'Purine alkaloid CNS stimulant featuring fused imidazole and pyrimidinedione rings.',
  },
  {
    id: 'paracetamol',
    name: 'Paracetamol',
    formulaName: 'Acetaminophen',
    smiles: 'CC(=O)Nc1ccc(O)cc1',
    category: 'Pharmaceuticals',
    description: 'Common antipyretic pain reliever with an amide and phenolic hydroxyl.',
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen',
    formulaName: '2-(4-Isobutylphenyl)propanoic acid',
    smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
    category: 'Pharmaceuticals',
    description: 'Non-steroidal anti-inflammatory drug (NSAID) with isobutyl and propionic acid moieties.',
  },
  {
    id: 'benzene',
    name: 'Benzene',
    formulaName: 'C6H6',
    smiles: 'c1ccccc1',
    category: 'Aromatics & Rings',
    description: 'Archetypal 6-carbon aromatic hydrocarbon with delocalized pi-electrons.',
  },
  {
    id: 'pyridine',
    name: 'Pyridine',
    formulaName: 'C5H5N',
    smiles: 'c1ccncc1',
    category: 'Aromatics & Rings',
    description: 'Basic heterocyclic aromatic compound with one nitrogen heteroatom.',
  },
  {
    id: 'naphthalene',
    name: 'Naphthalene',
    formulaName: 'C10H8',
    smiles: 'c1ccc2ccccc2c1',
    category: 'Aromatics & Rings',
    description: 'Fused bicyclic aromatic polycyclic hydrocarbon.',
  },
  {
    id: 'furan',
    name: 'Furan',
    formulaName: 'C4H4O',
    smiles: 'c1ccoc1',
    category: 'Aromatics & Rings',
    description: 'Five-membered heterocyclic ring containing one oxygen atom.',
  },
  {
    id: 'dopamine',
    name: 'Dopamine',
    formulaName: '4-(2-Aminoethyl)benzene-1,2-diol',
    smiles: 'c1cc(c(cc1CCN)O)O',
    category: 'Biomolecules',
    description: 'Catecholamine neurotransmitter essential for motor control and reward cognition.',
  },
  {
    id: 'serotonin',
    name: 'Serotonin',
    formulaName: '5-Hydroxytryptamine (5-HT)',
    smiles: 'c1cc2c(c[nH]2)c(c1)CCN',
    category: 'Biomolecules',
    description: 'Monoamine neurotransmitter with indole core modulating mood and behavior.',
  },
  {
    id: 'glucose',
    name: 'D-Glucose',
    formulaName: 'Alpha-D-glucopyranose',
    smiles: 'OCC1OC(O)C(O)C(O)C1O',
    category: 'Biomolecules',
    description: 'Hexose monosaccharide, key energetic substrate for cellular respiration.',
  },
  {
    id: 'ethanol',
    name: 'Ethanol',
    formulaName: 'Ethyl alcohol',
    smiles: 'CCO',
    category: 'Common Organics',
    description: 'Primary alcohol with a simple 3-heavy-atom linear chain.',
  },
  {
    id: 'acetone',
    name: 'Acetone',
    formulaName: 'Propan-2-one',
    smiles: 'CC(=O)C',
    category: 'Common Organics',
    description: 'Simplest ketone with a polarized carbonyl group (C=O).',
  },
  {
    id: 'acetic_acid',
    name: 'Acetic Acid',
    formulaName: 'Ethanoic acid',
    smiles: 'CC(=O)O',
    category: 'Common Organics',
    description: 'Fundamental carboxylic acid containing both carbonyl and hydroxyl oxygen atoms.',
  },
  {
    id: 'cubane',
    name: 'Cubane',
    formulaName: 'Pentacyclo-octane (C8H8)',
    smiles: 'C12C3C4C1C5C2C3C45',
    category: 'Aromatics & Rings',
    description: 'Synthetic 3D cube-shaped hydrocarbon with 90° strained bond angles.',
  },
];
