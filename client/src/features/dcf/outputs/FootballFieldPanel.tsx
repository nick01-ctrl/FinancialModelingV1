import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { FootballFieldRange } from '../../../engine/footballField';

interface Props {
  data: FootballFieldRange[];
}

export default function FootballFieldPanel({ data }: Props) {
  if (data.length === 0) return null;

  // Transform: each bar starts at low, extends to high
  const chartData = data.map((d) => ({
    name: d.label,
    offset: d.low,
    range: d.high - d.low,
    base: d.base,
    low: d.low,
    high: d.high,
    color: d.color,
  }));

  // Find the base case share price (first range's base)
  const basePrice = chartData[0]?.base ?? 0;

  // Domain: min of all lows to max of all highs with padding
  const allMin = Math.min(...chartData.map((d) => d.low));
  const allMax = Math.max(...chartData.map((d) => d.high));
  const padding = (allMax - allMin) * 0.15;
  const domainMin = Math.max(0, allMin - padding);
  const domainMax = allMax + padding;

  return (
    <div className="output-section">
      <h3 className="output-section-title">Football Field — Valuation Range</h3>
      <ResponsiveContainer width="100%" height={data.length * 55 + 60}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 50, left: 120, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[domainMin, domainMax]}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={115}
            fontSize={11}
            tick={{ fill: '#64748b' }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.[1]) return null;
              const item = payload[1].payload;
              return (
                <div
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
                  <div>Low: <strong>${item.low.toFixed(2)}</strong></div>
                  <div>Base: <strong>${item.base.toFixed(2)}</strong></div>
                  <div>High: <strong>${item.high.toFixed(2)}</strong></div>
                </div>
              );
            }}
          />
          <ReferenceLine
            x={basePrice}
            stroke="#0f172a"
            strokeWidth={2}
            strokeDasharray="6 3"
            label={{
              value: `$${basePrice.toFixed(2)}`,
              position: 'top',
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          {/* Invisible bar to create the offset */}
          <Bar dataKey="offset" stackId="stack" fill="transparent" />
          {/* Visible range bar */}
          <Bar dataKey="range" stackId="stack" radius={[4, 4, 4, 4]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.75} />
            ))}
            <LabelList
              dataKey="low"
              position="left"
              formatter={(v: number) => `$${v.toFixed(0)}`}
              style={{ fontSize: 10, fill: '#64748b' }}
              offset={5}
            />
            <LabelList
              dataKey="high"
              position="right"
              formatter={(v: number) => `$${v.toFixed(0)}`}
              style={{ fontSize: 10, fill: '#64748b' }}
              offset={5}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="football-field-legend">
        {data.map((d, i) => (
          <span key={i} className="football-field-legend-item">
            <span
              className="football-field-legend-dot"
              style={{ background: d.color }}
            />
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
