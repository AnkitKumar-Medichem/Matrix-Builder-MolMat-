"""
Molecular Adjacency Matrix Visualizer & Topological Graph Analyzer
Ready for Streamlit Community Cloud deployment.
"""

import math
import numpy as np
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

# Check for RDKit
try:
    from rdkit import Chem
    from rdkit.Chem import Draw, rdMolDescriptors, rdDepictor
    from rdkit.Chem.Draw import rdMolDraw2D
    HAS_RDKIT = True
    RDKIT_IMPORT_ERROR = None
except Exception as e:
    HAS_RDKIT = False
    RDKIT_IMPORT_ERROR = str(e)

# Pauling Electronegativities
ELECTRONEGATIVITY = {
    'H': 2.20, 'He': 0.00,
    'Li': 0.98, 'Be': 1.57, 'B': 2.04, 'C': 2.55, 'N': 3.04, 'O': 3.44, 'F': 3.98, 'Ne': 0.00,
    'Na': 0.93, 'Mg': 1.31, 'Al': 1.61, 'Si': 1.90, 'P': 2.19, 'S': 2.58, 'Cl': 3.16, 'Ar': 0.00,
    'K': 0.82, 'Ca': 1.00, 'Sc': 1.36, 'Ti': 1.54, 'V': 1.63, 'Cr': 1.66, 'Mn': 1.55, 'Fe': 1.83,
    'Co': 1.88, 'Ni': 1.91, 'Cu': 1.90, 'Zn': 1.65, 'Ga': 1.81, 'Ge': 2.01, 'As': 2.18, 'Se': 2.55,
    'Br': 2.96, 'Kr': 3.00, 'I': 2.66
}

# Covalent Radii in picometers (pm)
COVALENT_RADIUS = {
    'H': 31, 'He': 28,
    'Li': 128, 'Be': 96, 'B': 84, 'C': 76, 'N': 71, 'O': 66, 'F': 57, 'Ne': 58,
    'Na': 166, 'Mg': 141, 'Al': 121, 'Si': 111, 'P': 107, 'S': 105, 'Cl': 102, 'Ar': 106,
    'K': 203, 'Ca': 176, 'Sc': 170, 'Ti': 160, 'V': 153, 'Cr': 139, 'Mn': 139, 'Fe': 132,
    'Co': 126, 'Ni': 124, 'Cu': 132, 'Zn': 122, 'Ga': 122, 'Ge': 120, 'As': 119, 'Se': 120,
    'Br': 120, 'Kr': 116, 'I': 139
}

CARBON_REF_RADIUS = 76.0  # Reference Carbon covalent radius in pm
CARBON_REF_EN = 2.55      # Reference Carbon Pauling electronegativity

MATRIX_WEIGHTINGS = {
    "plain": "None (Plain Adjacency Matrix)",
    "topological_distance": "Topological Connectivity Matrix",
    "bond_order": "Bond Order",
    "atomic_number_prod": "Atomic Number Product (Z_i · Z_j)",
    "atomic_radius_sum": "Covalent Radius Sum (r_i + r_j)",
    "electronegativity_diff": "Electronegativity Difference (|Δχ|)",
    "laplacian": "Degree Laplacian (L = D - A)",
    "covalent_radius_rel_carbon": "Covalent Radius (rel. Carbon)",
    "electronegativity_rel_carbon": "Pauling Electronegativity (rel. Carbon)"
}


def parse_molecule(smiles_str: str):
    """Parses a SMILES string into atom and bond graph representation."""
    if not HAS_RDKIT:
        msg = "RDKit is not installed or could not be loaded."
        if RDKIT_IMPORT_ERROR:
            msg += f" Details: {RDKIT_IMPORT_ERROR}. Ensure 'rdkit' is in requirements.txt and 'libxrender1', 'libxext6' are in packages.txt."
        else:
            msg += " Please ensure 'rdkit' is in requirements.txt and 'libxrender1', 'libxext6' are in packages.txt."
        return None, msg
    try:
        mol = Chem.MolFromSmiles(smiles_str)
        if mol is None:
            return None, f"Invalid SMILES string: '{smiles_str}'"
        return mol, None
    except Exception as e:
        return None, str(e)


def get_mol_formula(mol):
    """Safely calculates the Hill system molecular formula."""
    if mol is None:
        return ""
    try:
        return rdMolDescriptors.CalcMolFormula(mol)
    except Exception:
        pass
    try:
        counts = {}
        for atom in mol.GetAtoms():
            sym = atom.GetSymbol()
            counts[sym] = counts.get(sym, 0) + 1
            h_count = atom.GetTotalNumHs()
            if h_count > 0:
                counts['H'] = counts.get('H', 0) + h_count
        parts = []
        if 'C' in counts:
            parts.append(f"C{counts['C']}" if counts['C'] > 1 else "C")
            del counts['C']
            if 'H' in counts:
                parts.append(f"H{counts['H']}" if counts['H'] > 1 else "H")
                del counts['H']
        for sym in sorted(counts.keys()):
            parts.append(f"{sym}{counts[sym]}" if counts[sym] > 1 else sym)
        return "".join(parts)
    except Exception:
        return ""


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
    while k <= n_atoms:
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
        # Standard Plain Adjacency Matrix (Step 1 of core algorithm: 1 if directly bonded, 0 otherwise)
        for u, v, _ in bonds:
            matrix[u, v] = 1.0
            matrix[v, u] = 1.0

    elif matrix_type in ("topological_distance", "topological_connectivity"):
        # Core 11-step MSF algorithm (all-pairs shortest path step distances 1, 2, 3...)
        msf = compute_msf_matrix(n, bonds)
        matrix = msf.astype(float)

    elif matrix_type == "bond_order":
        for u, v, order in bonds:
            matrix[u, v] = order
            matrix[v, u] = order

    elif matrix_type in ("atomic_number_prod", "atomic_number"):
        for u, v, _ in bonds:
            z_prod = float(atoms[u]["z"] * atoms[v]["z"])
            matrix[u, v] = z_prod
            matrix[v, u] = z_prod

    elif matrix_type == "atomic_radius_sum":
        for u, v, _ in bonds:
            r_u = COVALENT_RADIUS.get(atoms[u]["symbol"], 76.0)
            r_v = COVALENT_RADIUS.get(atoms[v]["symbol"], 76.0)
            r_sum = float(r_u + r_v)
            matrix[u, v] = r_sum
            matrix[v, u] = r_sum

    elif matrix_type in ("electronegativity_diff", "electronegativity"):
        for u, v, _ in bonds:
            chi_u = ELECTRONEGATIVITY.get(atoms[u]["symbol"], 2.5)
            chi_v = ELECTRONEGATIVITY.get(atoms[v]["symbol"], 2.5)
            diff = round(abs(chi_u - chi_v), 3)
            matrix[u, v] = diff
            matrix[v, u] = diff

    elif matrix_type == "laplacian":
        for u, v, _ in bonds:
            matrix[u, v] = -1.0
            matrix[v, u] = -1.0
        for i in range(n):
            matrix[i, i] = float(degrees[i])

    elif matrix_type == "covalent_radius_rel_carbon":
        for u, v, _ in bonds:
            r_u = COVALENT_RADIUS.get(atoms[u]["symbol"], 76.0)
            r_v = COVALENT_RADIUS.get(atoms[v]["symbol"], 76.0)
            val = round(((r_u + r_v) / 2.0) / CARBON_REF_RADIUS, 3)
            matrix[u, v] = val
            matrix[v, u] = val

    elif matrix_type == "electronegativity_rel_carbon":
        for u, v, _ in bonds:
            chi_u = ELECTRONEGATIVITY.get(atoms[u]["symbol"], 2.5)
            chi_v = ELECTRONEGATIVITY.get(atoms[v]["symbol"], 2.5)
            val = round(((chi_u + chi_v) / 2.0) / CARBON_REF_EN, 3)
            matrix[u, v] = val
            matrix[v, u] = val

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
    try:
        mol_copy = Chem.Mol(mol)
        try:
            rdDepictor.Compute2DCoords(mol_copy)
        except Exception:
            pass
        d = rdMolDraw2D.MolDraw2DSVG(480, 280)
        opts = d.drawOptions()
        opts.addAtomIndices = True
        opts.clearBackground = True
        opts.bondLineWidth = 2.0
        d.DrawMolecule(mol_copy)
        d.FinishDrawing()
        svg = d.GetDrawingText()
        svg_idx = svg.find("<svg")
        if svg_idx != -1:
            svg = svg[svg_idx:]
        return svg
    except Exception as e:
        return f'<div style="padding:20px;color:#64748b;text-align:center;">Structure diagram preview unavailable ({str(e)})</div>'


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

    rows_html = []
    # Header row
    header_cells = [
        f'<th style="width:{cell_size}px;min-width:{cell_size}px;max-width:{cell_size}px;height:{cell_size}px;background:#f1f5f9;border:1px solid #cbd5e1;color:#64748b;font-size:11px;font-weight:normal;padding:0;text-align:center;">i \\ j</th>'
    ]
    for j, atom in enumerate(atoms):
        header_cells.append(
            f'<th style="width:{cell_size}px;min-width:{cell_size}px;max-width:{cell_size}px;height:{cell_size}px;background:#f1f5f9;border:1px solid #cbd5e1;color:#334155;line-height:1;padding:0;text-align:center;">'
            f'<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:100%;">'
            f'<span style="font-weight:bold;font-size:11px;">{atom["symbol"]}</span>'
            f'<span style="color:#94a3b8;font-size:9px;">{j}</span>'
            f'</div></th>'
        )
    rows_html.append(f'<tr style="height:{cell_size}px;">{"".join(header_cells)}</tr>')

    # Data rows
    for i, atom in enumerate(atoms):
        cells = [
            f'<td style="width:{cell_size}px;min-width:{cell_size}px;max-width:{cell_size}px;height:{cell_size}px;background:#f1f5f9;border:1px solid #cbd5e1;color:#334155;line-height:1;padding:0;text-align:center;">'
            f'<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:100%;">'
            f'<span style="font-weight:bold;font-size:11px;">{atom["symbol"]}</span>'
            f'<span style="color:#94a3b8;font-size:9px;">{i}</span>'
            f'</div></td>'
        ]
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
                bg = "#dbeafe"
                color = "#1e40af"
                weight = "bold"
            else:
                bg = "#ffffff"
                color = "#94a3b8"
                weight = "normal"

            cells.append(
                f'<td id="cell-{i}-{j}" data-row="{i}" data-col="{j}" data-val="{display_val}" data-label="{atom["symbol"]}{i} - {atoms[j]["symbol"]}{j}" tabindex="{0 if (i==0 and j==0) else -1}" onclick="selectCell({i},{j})" onfocus="selectCell({i},{j})" style="width:{cell_size}px;min-width:{cell_size}px;max-width:{cell_size}px;height:{cell_size}px;background:{bg};color:{color};font-weight:{weight};border:1px solid #cbd5e1;font-size:11px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;padding:0;text-align:center;vertical-align:middle;cursor:pointer;outline:none;" title="A[{i},{j}] = {display_val} ({atom["symbol"]}{i} - {atoms[j]["symbol"]}{j})">'
                f'{display_val}</td>'
            )
        rows_html.append(f'<tr style="height:{cell_size}px;">{"".join(cells)}</tr>')

    table_content = "".join(rows_html)

    full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }}
  .matrix-wrapper {{
    overflow-x: auto;
    overflow-y: auto;
    max-width: 100%;
    padding: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    display: inline-block;
    outline: none;
  }}
  .matrix-box {{
    width: {total_size}px;
    height: {total_size}px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    overflow: hidden;
    background: #ffffff;
  }}
  table {{
    border-collapse: collapse;
    table-layout: fixed;
    width: {total_size}px;
    height: {total_size}px;
    text-align: center;
  }}
  td.active-cell {{
    background: #2563eb !important;
    color: #ffffff !important;
    font-weight: bold !important;
    outline: 2px solid #1d4ed8 !important;
    outline-offset: -2px;
  }}
  .keyboard-guide {{
    margin-top: 8px;
    font-size: 11px;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: {max(total_size, 380)}px;
  }}
  .key-badge {{
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    padding: 1px 5px;
    font-family: monospace;
    font-size: 10px;
    font-weight: bold;
    color: #334155;
  }}
  #cell-info {{
    font-family: monospace;
    font-weight: 600;
    color: #1e40af;
  }}
</style>
</head>
<body>
  <div class="matrix-wrapper" tabindex="0" id="matrix-container" title="Use Arrow Keys to navigate matrix">
    <div class="matrix-box">
      <table>
        <tbody>
          {table_content}
        </tbody>
      </table>
    </div>
  </div>
  <div class="keyboard-guide">
    <div>
      <span class="key-badge">↑</span>
      <span class="key-badge">↓</span>
      <span class="key-badge">←</span>
      <span class="key-badge">→</span>
      <span style="margin-left: 4px;">Arrow keys to navigate</span>
    </div>
    <div id="cell-info">A[0, 0]</div>
  </div>
  <script>
    let curR = 0, curC = 0;
    const n = {n};
    function selectCell(r, c) {{
      curR = Math.max(0, Math.min(n - 1, r));
      curC = Math.max(0, Math.min(n - 1, c));
      document.querySelectorAll('td[data-row]').forEach(el => el.classList.remove('active-cell'));
      const target = document.getElementById('cell-' + curR + '-' + curC);
      if (target) {{
        target.classList.add('active-cell');
        target.focus();
        target.scrollIntoView({{ block: 'nearest', inline: 'nearest' }});
        const info = document.getElementById('cell-info');
        if (info) {{
          info.textContent = 'A[' + curR + ', ' + curC + '] = ' + target.getAttribute('data-val') + ' (' + target.getAttribute('data-label') + ')';
        }}
      }}
    }}
    window.addEventListener('keydown', function(e) {{
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {{
        e.preventDefault();
        if (e.key === 'ArrowUp') selectCell(curR - 1, curC);
        else if (e.key === 'ArrowDown') selectCell(curR + 1, curC);
        else if (e.key === 'ArrowLeft') selectCell(curR, curC - 1);
        else if (e.key === 'ArrowRight') selectCell(curR, curC + 1);
        else if (e.key === 'Home') selectCell(curR, 0);
        else if (e.key === 'End') selectCell(curR, n - 1);
      }}
    }});
    // Initialize first cell
    setTimeout(() => selectCell(0, 0), 50);
  </script>
</body>
</html>"""
    return full_html, total_size


def main():
    st.set_page_config(
        page_title="MolMat",
        layout="centered",
        initial_sidebar_state="collapsed"
    )

    # Ensure Streamlit selectbox dropdown displays all options cleanly without clipping (matching preview app behavior)
    st.markdown(
        """
        <style>
        /* Prevent Streamlit form and column containers from clipping dropdown popover */
        [data-testid="stForm"],
        [data-testid="stForm"] > div,
        [data-testid="column"] {
            overflow: visible !important;
        }

        /* Ensure reasonable viewport clearance below form so dropdown opens downward without causing an outer page scrollbar */
        .main .block-container {
            padding-bottom: 220px !important;
        }

        /* Prevent parent popover wrappers from creating scrollbars (ELIMINATES DOUBLE SCROLLBAR) */
        div[data-baseweb="popover"],
        div[data-baseweb="popover"] > div,
        div[data-baseweb="menu"],
        [data-baseweb="menu"] {
            overflow: visible !important;
            max-height: none !important;
        }

        div[data-baseweb="popover"]::-webkit-scrollbar,
        div[data-baseweb="popover"] > div::-webkit-scrollbar,
        div[data-baseweb="menu"]::-webkit-scrollbar,
        [data-baseweb="menu"]::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }

        /* ONLY the inner list gets a SINGLE, clean scrollbar */
        ul[role="listbox"],
        div[role="listbox"] {
            max-height: 280px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            scrollbar-width: thin !important;
            scrollbar-color: #94a3b8 #f1f5f9 !important;
        }

        ul[role="listbox"]::-webkit-scrollbar,
        div[role="listbox"]::-webkit-scrollbar {
            width: 6px !important;
            display: block !important;
        }
        ul[role="listbox"]::-webkit-scrollbar-track,
        div[role="listbox"]::-webkit-scrollbar-track {
            background: #f1f5f9 !important;
            border-radius: 4px !important;
        }
        ul[role="listbox"]::-webkit-scrollbar-thumb,
        div[role="listbox"]::-webkit-scrollbar-thumb {
            background-color: #94a3b8 !important;
            border-radius: 4px !important;
        }
        ul[role="listbox"]::-webkit-scrollbar-thumb:hover,
        div[role="listbox"]::-webkit-scrollbar-thumb:hover {
            background-color: #64748b !important;
        }

        /* Clean dropdown option items without bullets or numbering */
        div[data-baseweb="popover"] ul,
        ul[role="listbox"] {
            list-style: none !important;
            list-style-type: none !important;
            padding-left: 0 !important;
            margin: 0 !important;
        }
        div[data-baseweb="popover"] li,
        div[data-baseweb="popover"] div[role="option"],
        ul[role="listbox"] li {
            list-style: none !important;
            list-style-type: none !important;
            padding: 6px 12px !important;
            min-height: 28px !important;
            font-size: 13px !important;
            line-height: 1.25 !important;
            cursor: pointer !important;
        }
        div[data-baseweb="popover"] li > div,
        div[data-baseweb="popover"] div[role="option"] > div {
            min-height: auto !important;
            padding: 1px 0 !important;
        }
        </style>
        """,
        unsafe_allow_html=True
    )

    st.title("MolMat")

    weighting_keys = list(MATRIX_WEIGHTINGS.keys())
    current_choice = st.session_state.get("ran_matrix_type", "plain")
    current_idx = weighting_keys.index(current_choice) if current_choice in weighting_keys else 0

    with st.form("smiles_calc_form", clear_on_submit=False):
        col_input, col_type = st.columns([2, 2])
        with col_input:
            smiles = st.text_input(
                "Enter SMILES String:",
                value=st.session_state.get("smiles_input", ""),
                placeholder="Enter SMILES string",
                key="input_smiles"
            )
        with col_type:
            matrix_type = st.selectbox(
                "Matrix Weighting:",
                options=weighting_keys,
                format_func=lambda k: MATRIX_WEIGHTINGS[k],
                index=current_idx,
                key="select_matrix_type"
            )
        run_submitted = st.form_submit_button("Run", type="primary")

    if run_submitted:
        st.session_state["has_run"] = True
        st.session_state["smiles_input"] = smiles
        st.session_state["ran_smiles"] = smiles
        st.session_state["ran_matrix_type"] = matrix_type

    if not st.session_state.get("has_run", False):
        return

    cur_smiles = st.session_state.get("ran_smiles", smiles).strip()
    if not cur_smiles:
        st.warning("Please enter a SMILES string to calculate the matrix.")
        return

    cur_matrix_type = st.session_state.get("ran_matrix_type", matrix_type)

    mol, err = parse_molecule(cur_smiles)
    if err:
        st.error(err)
        return

    data = calculate_matrix_data(mol, cur_matrix_type)
    n = len(data["atoms"])
    num_bonds = len(data["bonds"])
    is_plain = (cur_matrix_type == "plain")
    matrix_sum_display = str(int(data['matrix_sum'])) if is_plain else f"{data['matrix_sum']:.3f}"
    half_sum_display = str(int(data['half_sum'])) if is_plain else f"{data['half_sum']:.3f}"

    # Top badges summary
    st.markdown(
        f"""
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; font-size: 13px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; margin-bottom: 1rem;">
            <span>Formula: <strong>{get_mol_formula(mol)}</strong></span>
            <span style="color: #cbd5e1;">|</span>
            <span>Atoms: <strong>{n}</strong></span>
            <span style="color: #cbd5e1;">|</span>
            <span>Bonds: <strong>{num_bonds}</strong></span>
            <span style="color: #cbd5e1;">|</span>
            <span>Matrix Sum: <strong style="color: #1d4ed8;">{matrix_sum_display}</strong></span>
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

    matrix_html, total_size = render_uniform_square_matrix_html(data, cur_matrix_type)
    iframe_height = max(300, min(total_size + 90, 720))
    components.html(matrix_html, height=iframe_height, scrolling=True)

    st.write("")

    # 3. Matrix & Topological Indices panel
    st.markdown("#### Matrix & Topological Indices")
    c1, c2, c3, c4 = st.columns(4)

    with c1:
        st.metric(
            label="Matrix Sum (Σ M)",
            value=matrix_sum_display,
            help="Sum of all elements in current matrix"
        )
    with c2:
        st.metric(
            label="Upper Triangle (Σ i<j)",
            value=half_sum_display,
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
