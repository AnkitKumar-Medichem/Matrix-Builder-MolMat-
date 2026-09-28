import React, { useState } from 'react';

interface EigenvalueBarChartProps {
  eigenvalues: number[];
  matrixTypeLabel?: string;
}

export const EigenvalueBarChart: React.FC<EigenvalueBarChartProps> = ({
  eigenvalues,
  matrixTypeLabel = 'Current Matrix',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!eigenvalues || eigenvalues.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
        No eigenvalue data available for the current matrix.
      </div>
    );
  }

  const n = eigenvalues.length;

  // Key Spectral Properties
  const spectralRadius = Math.max(...eigenvalues.map((v) => Math.abs(v)));
  const spectralGap = n >= 2 ? eigenvalues[0] - eigenvalues[1] : 0;
  const graphEnergy = eigenvalues.reduce((sum, v) => sum + Math.abs(v), 0);
  const trace = eigenvalues.reduce((sum, v) => sum + v, 0);

  // SVG Chart Dimensions & Bounds
  const chartWidth = Math.max(520, n * 38 + 100);
  const chartHeight = 240;
  const margin = { top: 30, right: 30, bottom: 45, left: 55 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const rawMin = Math.min(...eigenvalues, 0);
  const rawMax = Math.max(...eigenvalues, 0);
  const span = Math.max(rawMax - rawMin, 1);
  const pad = span * 0.15;
  const yMin = rawMin < 0 ? rawMin - pad : 0;
  const yMax = rawMax > 0 ? rawMax + pad : pad;
  const yRange = yMax - yMin;

  const scaleY = (val: number): number => {
    return margin.top + innerHeight - ((val - yMin) / yRange) * innerHeight;
  };

  const zeroY = scaleY(0);

  // Y-axis tick values (5-6 ticks)
  const tickCount = 5;
  const ticks: number[] = [];
  for (let step = 0; step <= tickCount; step++) {
    const val = yMin + (step / tickCount) * yRange;
    ticks.push(val);
  }

  // Bar layout
  const barSpacing = innerWidth / n;
  const barWidth = Math.max(12, Math.min(36, barSpacing * 0.65));

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-xs space-y-4">
      {/* Header with Title and Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-800">
              Spectral Profile (Eigenvalue Spectrum)
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {n} Eigenvalues
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Eigenvalue distribution ordered by magnitude (λ₁ ≥ λ₂ ≥ … ≥ λₙ) characterizing molecular orbital stability and graph topology.
          </p>
        </div>
      </div>

      {/* Spectral Metrics Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-gray-700">
        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">
            Spectral Radius (ρ)
          </div>
          <div className="text-base font-bold text-blue-700">
            {spectralRadius.toFixed(3)}
          </div>
          <div className="text-[10px] text-gray-400 font-sans mt-0.5">
            max |λᵢ| (spectral norm)
          </div>
        </div>

        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">
            Spectral Gap (Δλ)
          </div>
          <div className="text-base font-bold text-indigo-700">
            {spectralGap.toFixed(3)}
          </div>
          <div className="text-[10px] text-gray-400 font-sans mt-0.5">
            λ₁ - λ₂ (algebraic expansion)
          </div>
        </div>

        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">
            Graph Energy (E)
          </div>
          <div className="text-base font-bold text-emerald-700">
            {graphEnergy.toFixed(3)}
          </div>
          <div className="text-[10px] text-gray-400 font-sans mt-0.5">
            Σ |λᵢ| (total orbital proxy)
          </div>
        </div>

        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans">
            Matrix Trace (Tr)
          </div>
          <div className="text-base font-bold text-purple-700">
            {Math.abs(trace) < 1e-4 ? '0' : trace.toFixed(3)}
          </div>
          <div className="text-[10px] text-gray-400 font-sans mt-0.5">
            Σ λᵢ (diagonal sum)
          </div>
        </div>
      </div>

      {/* Bar Chart Canvas Container */}
      <div className="w-full overflow-x-auto bg-gray-50/60 rounded-md border border-gray-200 p-2">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto select-none"
          style={{ minWidth: `${Math.min(chartWidth, 600)}px`, maxHeight: '280px' }}
        >
          {/* Horizontal Gridlines & Ticks */}
          {ticks.map((tickVal, i) => {
            const y = scaleY(tickVal);
            return (
              <g key={`tick-${i}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={chartWidth - margin.right}
                  y2={y}
                  stroke={Math.abs(tickVal) < 1e-4 ? '#94a3b8' : '#e2e8f0'}
                  strokeWidth={Math.abs(tickVal) < 1e-4 ? 1.5 : 1}
                  strokeDasharray={Math.abs(tickVal) < 1e-4 ? undefined : '3,3'}
                />
                <text
                  x={margin.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9px"
                  fontFamily="monospace"
                  fill="#64748b"
                >
                  {tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Zero Baseline Line (highlighted if visible) */}
          {yMin <= 0 && yMax >= 0 && (
            <line
              x1={margin.left}
              y1={zeroY}
              x2={chartWidth - margin.right}
              y2={zeroY}
              stroke="#64748b"
              strokeWidth={1.5}
            />
          )}

          {/* Eigenvalue Bars */}
          {eigenvalues.map((val, idx) => {
            const centerX = margin.left + idx * barSpacing + barSpacing / 2;
            const barX = centerX - barWidth / 2;
            const isHovered = hoveredIdx === idx;
            const isPositive = val >= 0;

            let barY = 0;
            let barH = 0;

            if (isPositive) {
              const yVal = scaleY(val);
              barY = yVal;
              barH = Math.max(2, zeroY - yVal);
            } else {
              barY = zeroY;
              barH = Math.max(2, scaleY(val) - zeroY);
            }

            // Color: Blue/indigo for positive, amber/coral for negative
            const fillColor = isHovered
              ? isPositive
                ? '#1d4ed8' // blue-700
                : '#c2410c' // orange-700
              : isPositive
              ? '#3b82f6' // blue-500
              : '#ea580c'; // orange-600

            return (
              <g
                key={`bar-${idx}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-opacity"
              >
                {/* Bar rectangle */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barH}
                  rx={3}
                  fill={fillColor}
                  stroke={isHovered ? '#1e3a8a' : 'none'}
                  strokeWidth={isHovered ? 1.5 : 0}
                  className="transition-all duration-150"
                />

                {/* Value Label above positive / below negative */}
                <text
                  x={centerX}
                  y={isPositive ? barY - 5 : barY + barH + 11}
                  textAnchor="middle"
                  fontSize="9px"
                  fontFamily="monospace"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  fill={isHovered ? '#0f172a' : '#475569'}
                >
                  {Math.abs(val) < 1e-4
                    ? '0'
                    : Math.abs(val - Math.round(val)) < 1e-4
                    ? Math.round(val).toString()
                    : val.toFixed(2)}
                </text>

                {/* X-axis label (\lambda_1, \lambda_2...) */}
                <text
                  x={centerX}
                  y={chartHeight - margin.bottom + 18}
                  textAnchor="middle"
                  fontSize="10px"
                  fontFamily="monospace"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  fill={isHovered ? '#1e40af' : '#64748b'}
                >
                  λ{idx + 1}
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={16}
            y={margin.top - 12}
            fontSize="10px"
            fontFamily="sans-serif"
            fontWeight="600"
            fill="#475569"
          >
            Eigenvalue (λ)
          </text>
          <text
            x={chartWidth - margin.right}
            y={chartHeight - 12}
            textAnchor="end"
            fontSize="10px"
            fontFamily="sans-serif"
            fontWeight="600"
            fill="#475569"
          >
            Spectrum Index (1 … {n})
          </text>
        </svg>
      </div>

      {/* Tooltip / Active Inspection Chip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-blue-50/50 border border-blue-100 p-2.5 rounded-md text-gray-700">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-900">Current Selection:</span>
          {hoveredIdx !== null ? (
            <span>
              Mode <strong>λ_{hoveredIdx + 1}</strong> ={' '}
              <strong className="text-blue-700">
                {eigenvalues[hoveredIdx].toFixed(4)}
              </strong>{' '}
              ({((Math.abs(eigenvalues[hoveredIdx]) / (spectralRadius || 1)) * 100).toFixed(1)}% of spectral radius)
            </span>
          ) : (
            <span className="text-gray-500 italic">
              Hover over any bar to inspect exact eigenvalue magnitude
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-500 font-sans">
          Spectrum of {matrixTypeLabel}
        </div>
      </div>
    </div>
  );
};
