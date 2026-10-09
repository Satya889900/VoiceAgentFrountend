import React, { useState, useMemo } from 'react';
import { TrendingUp, BarChart3, PieChart, Activity, Zap, DollarSign, Clock, Layers } from 'lucide-react';

export default function AnalyticsCharts({ metrics, sessions = [] }) {
  const [activeMetric, setActiveMetric] = useState('tokens'); // 'tokens' | 'cost' | 'duration'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Prepare chronological session data (oldest to newest for timeline chart)
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      // If no sessions yet, generate realistic preview points to show structure
      return [
        { id: '1', label: 'Start', tokens: 0, cost: 0, duration: 0, time: 'Init' },
        { id: '2', label: 'Turn 1', tokens: metrics?.totalTokens || 120, cost: metrics?.totalCost || 0.00015, duration: metrics?.totalDurationSeconds || 8, time: 'Live' }
      ];
    }

    const sorted = [...sessions].reverse(); // chronological
    return sorted.map((s, idx) => ({
      id: s.id,
      label: `S-${idx + 1}`,
      tokens: s.usage?.totalTokens || 0,
      inputTokens: s.usage?.inputTokens || 0,
      outputTokens: s.usage?.outputTokens || 0,
      cost: s.cost?.totalCost || 0,
      duration: s.durationSeconds || 0,
      persona: s.persona?.name || 'Assistant',
      time: new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
  }, [sessions, metrics]);

  // SVG Chart Dimensions
  const width = 680;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 55 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Compute Scales
  const values = chartData.map((d) => {
    if (activeMetric === 'cost') return d.cost;
    if (activeMetric === 'duration') return d.duration;
    return d.tokens;
  });

  const rawMax = Math.max(...values, 0);
  const maxValue = rawMax === 0 ? (activeMetric === 'cost' ? 0.001 : 100) : rawMax * 1.15;

  const points = chartData.map((d, idx) => {
    const val = activeMetric === 'cost' ? d.cost : activeMetric === 'duration' ? d.duration : d.tokens;
    const x = padding.left + (idx / Math.max(chartData.length - 1, 1)) * graphWidth;
    const y = padding.top + graphHeight - (val / maxValue) * graphHeight;
    return { x, y, data: d, val };
  });

  // Construct SVG Path (smooth bezier)
  const pathData = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [points]);

  // Closed area for background gradient
  const areaData = useMemo(() => {
    if (points.length === 0) return '';
    const bottomY = padding.top + graphHeight;
    const first = points[0];
    const last = points[points.length - 1];
    return `${pathData} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [pathData, points, padding, graphHeight]);

  // Color schemes based on selected metric
  const colorConfig = {
    tokens: {
      stroke: '#6366f1',
      gradientStart: 'rgba(99, 102, 241, 0.45)',
      gradientEnd: 'rgba(99, 102, 241, 0.0)',
      unit: 'tokens',
      format: (v) => Math.round(v).toLocaleString(),
    },
    cost: {
      stroke: '#fbbf24',
      gradientStart: 'rgba(251, 191, 36, 0.45)',
      gradientEnd: 'rgba(251, 191, 36, 0.0)',
      unit: 'USD',
      format: (v) => `$${v.toFixed(5)}`,
    },
    duration: {
      stroke: '#06b6d4',
      gradientStart: 'rgba(6, 182, 212, 0.45)',
      gradientEnd: 'rgba(6, 182, 212, 0.0)',
      unit: 'seconds',
      format: (v) => `${Math.round(v)}s`,
    },
  }[activeMetric];

  // Token Distribution Calculations
  const inTokens = metrics?.totalInputTokens || 0;
  const outTokens = metrics?.totalOutputTokens || 0;
  const totalTokens = Math.max(1, inTokens + outTokens);
  const inPct = Math.round((inTokens / totalTokens) * 100);
  const outPct = 100 - inPct;

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div className="analytics-title-group">
          <div className="chart-icon-badge">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3>Real-Time Telemetry & Trends</h3>
            <p className="chart-sub">Visual usage analytics across all active and past sessions</p>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="metric-pills">
          <button
            className={`pill-btn ${activeMetric === 'tokens' ? 'active tokens' : ''}`}
            onClick={() => setActiveMetric('tokens')}
          >
            <Layers size={13} />
            <span>Tokens</span>
          </button>
          <button
            className={`pill-btn ${activeMetric === 'cost' ? 'active cost' : ''}`}
            onClick={() => setActiveMetric('cost')}
          >
            <DollarSign size={13} />
            <span>Cost ($)</span>
          </button>
          <button
            className={`pill-btn ${activeMetric === 'duration' ? 'active duration' : ''}`}
            onClick={() => setActiveMetric('duration')}
          >
            <Clock size={13} />
            <span>Duration</span>
          </button>
        </div>
      </div>

      {/* Main SVG Trend Chart */}
      <div className="chart-canvas-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="telemetry-chart"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorConfig.gradientStart} />
              <stop offset="100%" stopColor={colorConfig.gradientEnd} />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + graphHeight * (1 - pct);
            const val = maxValue * pct;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.12)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="rgba(148, 163, 184, 0.6)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {colorConfig.format(val)}
                </text>
              </g>
            );
          })}

          {/* Shaded Area */}
          <path d={areaData} fill="url(#areaGradient)" />

          {/* Smooth Trend Line */}
          <path
            d={pathData}
            fill="none"
            stroke={colorConfig.stroke}
            strokeWidth="3"
            filter="url(#glow)"
          />

          {/* Interactive Data Points */}
          {points.map((pt, i) => (
            <g
              key={i}
              className="chart-dot-group"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Invisible touch target */}
              <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" cursor="pointer" />
              {/* Visible dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint === pt ? 6 : 4}
                fill={colorConfig.stroke}
                stroke="#0f172a"
                strokeWidth="2"
                className="chart-point"
              />
              {/* X Axis Labels */}
              <text
                x={pt.x}
                y={height - 12}
                fill="rgba(148, 163, 184, 0.7)"
                fontSize="10"
                textAnchor="middle"
                fontFamily="inherit"
              >
                {pt.data.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${Math.max(10, (hoveredPoint.y / height) * 100 - 30)}%`,
            }}
          >
            <div className="tooltip-title">{hoveredPoint.data.persona}</div>
            <div className="tooltip-val">
              {colorConfig.format(hoveredPoint.val)} {colorConfig.unit}
            </div>
            <div className="tooltip-time">Time: {hoveredPoint.data.time}</div>
          </div>
        )}
      </div>

      {/* Breakdown Metrics Below Graph */}
      <div className="token-breakdown-bar">
        <div className="breakdown-header">
          <span>Token Distribution Ratio</span>
          <span className="ratio-legend">
            <span className="dot dot-indigo" /> Input: {inPct}%
            <span className="dot dot-cyan" /> Output: {outPct}%
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-seg seg-input" style={{ width: `${inPct}%` }} title={`Input: ${inTokens.toLocaleString()} tokens`} />
          <div className="progress-seg seg-output" style={{ width: `${outPct}%` }} title={`Output: ${outTokens.toLocaleString()} tokens`} />
        </div>
      </div>
    </div>
  );
}
