"""
Molecular Adjacency Matrix Visualizer & Topological Graph Analyzer
Ready for Streamlit Community Cloud deployment.
"""

import math
import numpy as np
import pandas as pd
import streamlit as st

# Check for RDKit
try:
    from rdkit import Chem
    from rdkit.Chem import Draw
    from rdkit.Chem.Draw import rdMolDraw2D
    HAS_RDKIT = True
except ImportError:
    HAS_RDKIT = False

# Pauling Electronegativities
ELECTRONEGATIVITY = {
    'H': 2.20, 'He': 0.00,
    'Li': 0.98, 'Be': 1.57, 'B': 2.04, 'C': 2.55, 'N': 3.04, 'O': 3.44, 'F': 3.98, 'Ne': 0.00,
    'Na': 0.93, 'Mg': 1.31, 'Al': 1.61, 'Si': 1.90, 'P': 2.19, 'S': 2.58, 'Cl': 3.16, 'Ar': 0.00,
    'K': 0.82, 'Ca': 1.00, 'Sc': 1.36, 'Ti': 1.54, 'V': 1.63, 'Cr': 1.66, 'Mn': 1.55, 'Fe': 1.83,
    'Co': 1.88, 'Ni': 1.91, 'Cu': 1.90, 'Zn': 1.65, 'Ga': 1.81, 'Ge': 2.01, 'As': 2.18, 'Se': 2.55,
    'Br': 2.96, 'Kr': 3.00, 'I': 2.66
}

PRESETS = [
    {"name": "Benzene", "smiles": "c1ccccc1"},
    {"name": "Pyridine", "smiles": "c1ccncc1"},
    {"name": "Aspirin", "smiles": "CC(=O)Oc1ccccc1C(=O)O"},
    {"name": "Caffeine", "smiles": "CN1C=NC2=C1C(=O)N(C(=O)N2C)C"},
    {"name": "Ethanol", "smiles": "CCO"},
    {"name": "Toluene", "smiles": "Cc1ccccc1"},
    {"name": "Acetone", "smiles": "CC(=O)C"},
]

MATRIX_WEIGHTINGS = {
    "plain": "Plain Adjacency Matrix",
    "bond_order": "Bond Order Weighted (Single=1, Double=2, Triple=3, Aromatic=1.5)",
    "atomic_number": "Atomic Number Weighted (Z_i · Z_j)",
    "electronegativity": "Electronegativity Difference (|Δχ|)",
    "laplacian": "Laplacian Matrix (L = D - A)"
}


def parse_molecule(smiles_str: str):
    """Parses a SMILES string into atom and bond graph representation."""
    if not HAS_RDKIT:
        return None, "RDKit is not installed. Please add rdkit to requirements.txt."
    try:
        mol = Chem.MolFromSmiles(smiles_str)
        if mol is None:
            return None, f"Invalid SMILES string: '{smiles_str}'"
        return mol, None
    except Exception as e:
        return None, str(e)


def compute_msf_matrix(n_atoms: int, bonds: list):
    """
    Core MSF (Molecular Structure Fingerprint / Matrix) Generation Algorithm:
    (1) Obtain the adjacency matrix (matrix initially containing only 0 and 1, and k is 1).
    (2) Identify atom pairs with the step size of k in the MSF and store the coordinates of matrix in the C (i.e., (i1, j1), (i2, j2), …), representing directly connected atoms pairs.
    (3) If the C is empty, indicating the current MSF has been fully generated, end the entire process, else continue to procedure (4).
    (4) Iterate through the C to get the element mj.
    (5) Find all atoms adjacent to atom index mj, and record them in the LMj (i.e., m1, m2, …).
    (6) If the LMj is empty, indicating there is no atom adjacent to atom index mh currently, continue to procedure (10), else continue to procedure (7).
    (7) Iterate through the LMj to get element mh.
    (8) Record the ai , h(i ≠ h) from MSF as sm i , m h.
    (9) If the sm i , m h is 0, indicating that the current position has never been filled before, fill the value of sm i , m h with k + 1, then proceed to procedure (6). If the sm i , m h is not 0, continue to procedure (6).
    (10) If the C is empty, indicating the traversal of current atom pairs with the step size of k in MSF is complete, continue to procedure (11), else continue to procedure (4).
    (11) k plus 1 and continue to procedure (1).
    """
    # (1) Obtain the adjacency matrix (matrix initially containing only 0 and 1, and k is 1)
    msf = np.zeros((n_atoms, n_atoms), dtype=int)
    adj = {i: [] for i in range(n_atoms)}
    for u, v, _ in bonds:
        msf[u, v] = 1
        msf[v, u] = 1
        adj[u].append(v)
        adj[v].append(u)

    k = 1
    while True:
        # (2) Identify atom pairs with the step size of k in the MSF and store coordinates in C
        C = []
        for i in range(n_atoms):
            for j in range(n_atoms):
                if msf[i, j] == k:
                    C.append((i, j))

        # (3) If C is empty, indicating the current MSF has been fully generated, end the entire process
        if not C:
            break

        # (4) Iterate through C to get element mj
        for i, mj in C:
            # (5) Find all atoms adjacent to atom index mj, and record them in LMj
            LMj = adj.get(mj, [])

            # (6) If LMj is empty, continue to (10)
            if not LMj:
                continue

            # (7) Iterate through LMj to get element mh
            for mh in LMj:
                # (8) Record ai,h (i ≠ h) from MSF as sm i, mh
                if i != mh:
                    sm_i_mh = msf[i, mh]
                    # (9) If sm i, mh is 0, fill value with k + 1
                    if sm_i_mh == 0:
                        msf[i, mh] = k + 1

        # (10) Traversal of current atom pairs with step size k in MSF complete
        # (11) k plus 1 and continue to procedure (1)
        k += 1

    return msf


def compute_shortest_paths(n_atoms: int, bonds: list):
    """Computes all-pairs topological distance matrix using the core MSF algorithm."""
    msf = compute_msf_matrix(n_atoms, bonds)
    dist = np.full((n_atoms, n_atoms), np.inf)
    np.fill_diagonal(dist, 0)
    for i in range(n_atoms):
        for j in range(n_atoms):
            if i != j and msf[i, j] > 0:
                dist[i, j] = msf[i, j]
    return dist


def calculate_matrix_data(mol, matrix_type: str):
    """Calculates the specified matrix and topological invariants."""
    n = mol.GetNumAtoms()
    atoms = [{"index": a.GetIdx(), "symbol": a.GetSymbol(), "z": a.GetAtomicNum()} for a in mol.GetAtoms()]

    bonds = []
    for b in mol.GetBonds():
        u = b.GetBeginAtomIdx()
        v = b.GetEndAtomIdx()
        order_val = 1.0
        if b.GetIsAromatic():
            order_val = 1.5
        elif b.GetBondType() == Chem.rdchem.BondType.DOUBLE:
            order_val = 2.0
        elif b.GetBondType() == Chem.rdchem.BondType.TRIPLE:
            order_val = 3.0
        bonds.append((u, v, order_val))

    dist_matrix = compute_shortest_paths(n, bonds)

    # Degrees
    degrees = [0] * n
    for u, v, _ in bonds:
        degrees[u] += 1
        degrees[v] += 1

    matrix = np.zeros((n, n), dtype=float)

    if matrix_type == "plain":
        # Core 11-step MSF algorithm (step distances 1, 2, 3...)
        msf = compute_msf_matrix(n, bonds)
        matrix = msf.astype(float)

    elif matrix_type == "electronegativity":
        for u, v, _ in bonds:
            chi_u = ELECTRONEGATIVITY.get(atoms[u]["symbol"], 2.5)
            chi_v = ELECTRONEGATIVITY.get(atoms[v]["symbol"], 2.5)
            diff = round(abs(chi_u - chi_v), 3)
            matrix[u, v] = diff
            matrix[v, u] = diff

    elif matrix_type == "bond_order":
        for u, v, order in bonds:
            matrix[u, v] = order
            matrix[v, u] = order

    elif matrix_type == "atomic_number":
        for u, v, _ in bonds:
            z_prod = atoms[u]["z"] * atoms[v]["z"]
            matrix[u, v] = z_prod
            matrix[v, u] = z_prod

    elif matrix_type == "laplacian":
        for u, v, _ in bonds:
            matrix[u, v] = -1.0
            matrix[v, u] = -1.0
        for i in range(n):
            matrix[i, i] = degrees[i]

    # Invariants
    matrix_sum = float(np.sum(matrix))
    half_sum = float(np.sum(np.triu(matrix, k=1)))

    wiener_index = 0
    for i in range(n):
        for j in range(i + 1, n):
            if np.isfinite(dist_matrix[i, j]):
                wiener_index += int(dist_matrix[i, j])

    randic_index = 0.0
    second_zagreb = 0.0
    for u, v, _ in bonds:
        du = degrees[u]
        dv = degrees[v]
        if du > 0 and dv > 0:
            randic_index += 1.0 / math.sqrt(du * dv)
            second_zagreb += du * dv

    first_zagreb = float(sum(d * d for d in degrees))

    # Eigenvalues / Spectral profile
    try:
        if np.allclose(matrix, matrix.T):
            eigenvals = np.linalg.eigvalsh(matrix)
        else:
            eigenvals = np.linalg.eigvals(matrix).real
        eigenvals = np.sort(eigenvals)[::-1]
    except Exception:
        eigenvals = np.zeros(n)

    return {
        "atoms": atoms,
        "bonds": bonds,
        "matrix": matrix,
        "matrix_sum": matrix_sum,
        "half_sum": half_sum,
        "wiener_index": wiener_index,
        "randic_index": randic_index,
        "first_zagreb": first_zagreb,
        "second_zagreb": second_zagreb,
        "eigenvalues": eigenvals,
    }


def draw_molecule_svg(mol):
    """Draws 2D chemical structure with atom indices highlighted."""
    d = rdMolDraw2D.MolDraw2DSVG(480, 280)
    opts = d.drawOptions()
    opts.addAtomIndices = True
    opts.clearBackground = True
    opts.bondLineWidth = 2.0
    d.DrawMolecule(mol)
    d.FinishDrawing()
    return d.GetDrawingText()


def render_uniform_square_matrix_html(matrix_data, matrix_type: str):
    """
    Renders the matrix as an exact uniform square box with equal-sized square partitions (fixed to L / 52px).
    """
    atoms = matrix_data["atoms"]
    matrix = matrix_data["matrix"]
    n = len(atoms)
    cell_size = 52  # Fixed L partition size
    total_size = (n + 1) * cell_size
    is_plain = (matrix_type == "plain")

    html = f"""
    <div style="overflow-x: auto; max-height: 480px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="width: {total_size}px; height: {total_size}px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #ffffff;">
        <table style="border-collapse: collapse; table-layout: fixed; width: {total_size}px; height: {total_size}px; font-family: ui-monospace, monospace; text-align: center;">
          <thead>
            <tr style="height: {cell_size}px;">
              <th style="width: {cell_size}px; height: {cell_size}px; max-width: {cell_size}px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #64748b; font-size: 11px; font-weight: normal;">
                i \\ j
              </th>
    """

    for j, atom in enumerate(atoms):
        html += f"""
              <th style="width: {cell_size}px; height: {cell_size}px; max-width: {cell_size}px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #334155; line-height: 1;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;">
                  <span style="font-weight: bold; font-size: 11px;">{atom['symbol']}</span>
                  <span style="color: #94a3b8; font-size: 9px;">{j}</span>
                </div>
              </th>
        """

    html += """
            </tr>
          </thead>
          <tbody>
    """

    for i, atom in enumerate(atoms):
        html += f"""
            <tr style="height: {cell_size}px;">
              <td style="width: {cell_size}px; height: {cell_size}px; max-width: {cell_size}px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #334155; line-height: 1;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;">
                  <span style="font-weight: bold; font-size: 11px;">{atom['symbol']}</span>
                  <span style="color: #94a3b8; font-size: 9px;">{i}</span>
                </div>
              </td>
        """
        for j in range(n):
            val = matrix[i, j]
            is_active = (abs(val) > 1e-6)
            if is_plain:
                display_val = str(int(val))
            elif abs(val - round(val)) < 1e-5:
                display_val = str(int(round(val)))
            elif abs(val * 2 - round(val * 2)) < 1e-5:
                display_val = f"{val:.1f}"
            else:
                display_val = f"{val:.3f}"

            if is_active:
                bg = "#dbeafe"  # blue-100
                color = "#1e40af"  # blue-800
                weight = "bold"
            else:
                bg = "#ffffff"
                color = "#94a3b8"  # slate-400
                weight = "normal"

            html += f"""
              <td style="width: {cell_size}px; height: {cell_size}px; max-width: {cell_size}px; background: {bg}; color: {color}; font-weight: {weight}; border: 1px solid #e2e8f0; font-size: 11px;">
                {display_val}
              </td>
            """
        html += "</tr>"

    html += """
          </tbody>
        </table>
      </div>
    </div>
    """
    return html


def main():
    st.set_page_config(
        page_title="MolMat",
        layout="centered",
        initial_sidebar_state="collapsed"
    )

    st.title("MolMat")
    st.markdown("Topological Graph Analysis & Weighted Adjacency Matrices for Organic Molecules.")

    # Preset selector
    preset_cols = st.columns(len(PRESETS))
    selected_smiles = "c1ccccc1"

    for idx, p in enumerate(PRESETS):
        if preset_cols[idx].button(p["name"], key=f"btn_{p['name']}"):
            st.session_state["smiles_input"] = p["smiles"]

    if "smiles_input" not in st.session_state:
        st.session_state["smiles_input"] = "c1ccccc1"

    col_input, col_type = st.columns([2, 2])
    with col_input:
        smiles = st.text_input("Enter SMILES String:", value=st.session_state["smiles_input"])
    with col_type:
        matrix_type = st.selectbox(
            "Matrix Weighting:",
            options=list(MATRIX_WEIGHTINGS.keys()),
            format_func=lambda k: MATRIX_WEIGHTINGS[k]
        )

    # Run button just below weighting technique panel
    if st.button("Calculate Matrix", type="primary", key="btn_run"):
        st.session_state["has_run"] = True
        st.session_state["ran_smiles"] = smiles
        st.session_state["ran_matrix_type"] = matrix_type

    if not st.session_state.get("has_run", False):
        return

    cur_smiles = smiles
    cur_matrix_type = matrix_type

    mol, err = parse_molecule(cur_smiles)
    if err:
        st.error(err)
        return

    data = calculate_matrix_data(mol, cur_matrix_type)
    n = len(data["atoms"])
    num_bonds = len(data["bonds"])
    is_plain = (cur_matrix_type == "plain")

    # Top badges summary
    st.markdown(
        f"""
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; font-size: 13px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; margin-bottom: 1rem;">
            <span>Formula: <strong>{Chem.rdMolDescriptors.CalcMolFormula(mol)}</strong></span>
            <span style="color: #cbd5e1;">|</span>
            <span>Atoms: <strong>{n}</strong></span>
            <span style="color: #cbd5e1;">|</span>
            <span>Bonds: <strong>{num_bonds}</strong></span>
            <span style="color: #cbd5e1;">|</span>
            <span>Matrix Sum: <strong style="color: #1d4ed8;">{int(data['matrix_sum']) if is_plain else f"{data['matrix_sum']:.3f}"}</strong></span>
            <span style="color: #cbd5e1;">|</span>
            <span>Wiener Index: <strong style="color: #047857;">{data['wiener_index']}</strong></span>
        </div>
        """,
        unsafe_allow_html=True
    )

    # 1. 2D Chemical Structure diagram (TOP)
    st.markdown("### 2D Chemical Structure")
    svg_img = draw_molecule_svg(mol)
    st.markdown(f'<div style="text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">{svg_img}</div>', unsafe_allow_html=True)

    st.write("")

    # 2. Adjacency Matrix (PLOTTED BELOW THE STRUCTURE)
    st.markdown("### Adjacency Matrix")
    st.caption("Uniform square box with equal-sized square partitions (Size L: 52px).")

    matrix_html = render_uniform_square_matrix_html(data, matrix_type)
    st.markdown(matrix_html, unsafe_allow_html=True)

    st.write("")

    # 3. Matrix & Topological Indices panel
    st.markdown("#### Matrix & Topological Indices")
    c1, c2, c3, c4 = st.columns(4)

    with c1:
        st.metric(
            label="Matrix Sum (Σ M)",
            value=f"{int(data['matrix_sum']) if is_plain else f'{data['matrix_sum']:.3f}'}",
            help="Sum of all elements in current matrix"
        )
    with c2:
        st.metric(
            label="Upper Triangle (Σ i<j)",
            value=f"{int(data['half_sum']) if is_plain else f'{data['half_sum']:.3f}'}",
            help="Half-sum of symmetric matrix elements (total bonds in unweighted graph)"
        )
    with c3:
        st.metric(
            label="Wiener Index (W)",
            value=f"{data['wiener_index']}",
            help="Sum of all shortest topological distances (molecular size & compactness)"
        )
    with c4:
        st.metric(
            label="Randić Index (χ)",
            value=f"{data['randic_index']:.3f}",
            help="Branching degree index: Σ 1/√(d_u · d_v)"
        )

    st.write("")

    # 4. Spectral Profile (Eigenvalue Spectrum Bar Chart)
    st.markdown("### Spectral Profile (Eigenvalue Spectrum)")
    st.caption("Bar chart of eigenvalues (λ₁ ≥ λ₂ ≥ … ≥ λₙ) of the current matrix representing the molecular spectral profile.")

    eigenvalues = data.get("eigenvalues", [])
    if len(eigenvalues) > 0:
        spectral_radius = float(np.max(np.abs(eigenvalues)))
        spectral_gap = float(eigenvalues[0] - eigenvalues[1]) if len(eigenvalues) >= 2 else 0.0
        graph_energy = float(np.sum(np.abs(eigenvalues)))
        trace = float(np.sum(eigenvalues))

        sc1, sc2, sc3, sc4 = st.columns(4)
        with sc1:
            st.metric("Spectral Radius (ρ)", f"{spectral_radius:.3f}")
        with sc2:
            st.metric("Spectral Gap (Δλ)", f"{spectral_gap:.3f}")
        with sc3:
            st.metric("Graph Energy (E)", f"{graph_energy:.3f}")
        with sc4:
            st.metric("Matrix Trace", f"{trace:.3f}")

        e_df = pd.DataFrame(
            {"Eigenvalue (λ)": eigenvalues},
            index=[f"λ{i+1}" for i in range(len(eigenvalues))]
        )
        st.bar_chart(e_df, use_container_width=True)

    # CSV Export Button
    df_matrix = pd.DataFrame(
        data["matrix"],
        index=[f"{a['symbol']}{i}" for i, a in enumerate(data["atoms"])],
        columns=[f"{a['symbol']}{i}" for i, a in enumerate(data["atoms"])]
    )
    csv_bytes = df_matrix.to_csv().encode('utf-8')
    st.download_button(
        label="Export Matrix as CSV",
        data=csv_bytes,
        file_name=f"matrix_{matrix_type}_{smiles}.csv",
        mime="text/csv",
    )


if __name__ == "__main__":
    main()
