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
} from 'recharts';
import type { TornadoBar } from '../../../engine/types';

interface Props {
  data: TornadoBar[];
}

export default function TornadoPanel({ data }: Props) {
  if (data.length === 0) return null;

  const baseValue = data[0]?.baseValue ?? 0;

  // Transform data for tornado chart
  const chartData = data.slice(0, 10).map((bar) => ({
    name: bar.label,
    low: (bar.lowValue ?? 0) - baseValue,
    high: (bar.highValue ?? 0) - baseValue,
    lowAbs: bar.lowValue,
    highAbs: bar.highValue,
  }));

  return (
    <div className="output-section">
      <h3 className="output-section-title">
        Tornado Chart — Impact on Implied Share Price (±10%)
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 35 + 50)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 40, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `$${(v + baseValue).toFixed(1)}`}
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={95}
            fontSize={11}
            tick={{ fill: '#64748b' }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              `$${(value + baseValue).toFixed(2)}`,
              name === 'low' ? 'Low Case' : 'High Case',
            ]}
            labelFormatter={(label: string) => label}
          />
          <ReferenceLine x={0} stroke="#0f172a" strokeWidth={2} />
          <Bar dataKey="low" stackId="stack" fill="#ef4444" radius={[4, 0, 0, 4]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={chartData[index].low < 0 ? '#ef4444' : '#22c55e'} />
            ))}
          </Bar>
          <Bar dataKey="high" stackId="stack" fill="#22c55e" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={chartData[index].high > 0 ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
        Base case: ${baseValue.toFixed(2)} per share
      </div>
    </div>
  );
}
