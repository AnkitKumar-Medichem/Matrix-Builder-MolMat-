# ⚗️ Molecular Adjacency Matrix Visualizer (Streamlit)

A chemical graph theory web app for computing, visualizing, and analyzing molecular adjacency matrices and topological indices (Wiener index, Randić index, Zagreb indices) directly from SMILES chemical notations.

## 🚀 Deploy to Streamlit Cloud

1. **Push to GitHub**:
   - Push this repository to your GitHub account (or export directly via Google AI Studio).

2. **Deploy on Streamlit Community Cloud**:
   - Go to [share.streamlit.io](https://share.streamlit.io).
   - Click **"New app"**.
   - Select your repository, branch (`main`), and set **Main file path** to `app.py` (or `streamlit_app.py`).
   - Click **"Deploy!"**. Streamlit Cloud will automatically install dependencies from `requirements.txt` and launch your app.

## 📦 Requirements
- Python 3.10+
- `streamlit>=1.35.0`
- `rdkit>=2023.9.5`
- `pandas>=2.0.0`
- `numpy>=1.24.0`
- `matplotlib>=3.7.0`
- `seaborn>=0.12.0`

## 🛠 Features
- **SMILES Input & Presets**: Benzene, Pyridine, Aspirin, Caffeine, Ethanol, Toluene, Acetone.
- **2D Chemical Diagram**: Rendered directly with numbered atom indices ($0 \dots N-1$).
- **Uniform Square Matrix**: Rendered directly **below the structure** as an exact square box with equal-sized square partitions ($52\text{px}$ size L).
- **Matrix Weighting Schemes**:
  - Plain Binary Adjacency (Unweighted)
  - Electronegativity Difference ($|\Delta \chi|$)
  - Bond Order Weighted ($1, 1.5, 2, 3$)
  - Topological Distance Matrix (Shortest Path)
  - Atomic Number Product ($Z_i \cdot Z_j$)
  - Laplacian Matrix ($L = D - A$)
- **Topological Indices**:
  - Matrix Sum ($\Sigma M$)
  - Upper Triangle ($\Sigma_{i < j}$)
  - Wiener Index ($W$)
  - Randić Branching Index ($\chi$)
- **CSV Export**: One-click matrix export to CSV.
