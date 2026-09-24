/**
 * Export Modal: Provides one-click export for Python NumPy, LaTeX, MATLAB, CSV, and JSON.
 */

import React, { useState } from 'react';
import { Atom, MatrixResult } from '../types/chem';
import { X, Copy, Check, Download, Code } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  matrixResult: MatrixResult;
  atoms: Atom[];
  smiles: string;
  precision: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  matrixResult,
  atoms,
  smiles,
  precision,
}) => {
  const [format, setFormat] = useState<'python' | 'latex' | 'matlab' | 'csv' | 'json'>('python');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const { matrix, type, normalization } = matrixResult;

  const formatVal = (v: number) => {
    return precision === 0 ? Math.round(v).toString() : v.toFixed(precision);
  };

  // Generate code / text based on format
  const getExportString = (): string => {
    switch (format) {
      case 'python': {
        const rows = matrix.map(
          (row) => `    [${row.map(formatVal).join(', ')}]`
        );
        return `# SMILES: ${smiles}\n# Matrix Type: ${type} | Normalization: ${normalization}\nimport numpy as np\n\nA = np.array([\n${rows.join(',\n')}\n])\n`;
      }
      case 'latex': {
        const rows = matrix.map((row) => row.map(formatVal).join(' & '));
        return `% SMILES: ${smiles}\n\\begin{bmatrix}\n  ${rows.join(' \\\\\n  ')}\n\\end{bmatrix}\n`;
      }
      case 'matlab': {
        const rows = matrix.map((row) => row.map(formatVal).join(' '));
        return `% SMILES: ${smiles}\n% Matrix: ${type} (${normalization})\nA = [\n  ${rows.join(';\n  ')}\n];\n`;
      }
      case 'csv': {
        const header = ['Atom', ...atoms.map((a, idx) => `${a.symbol}${idx}`)].join(',');
        const rows = matrix.map((row, idx) => {
          const rowLabel = `${atoms[idx]?.symbol || ''}${idx}`;
          return [rowLabel, ...row.map(formatVal)].join(',');
        });
        return `${header}\n${rows.join('\n')}\n`;
      }
      case 'json': {
        return JSON.stringify(
          {
            smiles,
            matrixType: type,
            normalization,
            dimension: matrix.length,
            atoms: atoms.map((a, i) => ({ index: i, symbol: a.symbol, atomicNumber: a.atomicNumber })),
            matrix: matrix.map((r) => r.map((v) => Number(formatVal(v)))),
          },
          null,
          2
        );
      }
    }
  };

  const codeContent = getExportString();

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csvContent = getExportString();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `molmatrix_${type}_${normalization}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#0b0f19] border border-slate-700/80 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0e1322]">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white font-mono">
              Export Adjacency Matrix
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Format Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#06080e] border border-slate-800 rounded-lg">
            {(['python', 'latex', 'matlab', 'csv', 'json'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`flex-1 py-1.5 text-xs font-mono uppercase rounded transition-colors ${
                  format === fmt
                    ? 'bg-[#151c2e] text-cyan-300 font-semibold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fmt === 'python' ? 'NumPy (Python)' : fmt}
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="relative">
            <pre className="w-full h-64 overflow-auto bg-[#07090e] border border-slate-800 rounded-lg p-4 font-mono text-xs text-cyan-200/90 leading-relaxed select-all">
              {codeContent}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-mono text-slate-500">
              Format: {format.toUpperCase()} · Precision: {precision} decimals
            </span>

            <div className="flex items-center gap-2">
              {format === 'csv' && (
                <button
                  onClick={handleDownloadCsv}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono text-slate-200 bg-[#141b2c] border border-slate-700 rounded-lg hover:border-slate-500 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download .CSV</span>
                </button>
              )}

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
