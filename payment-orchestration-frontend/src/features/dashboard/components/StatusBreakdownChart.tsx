import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { TransactionSummary } from '../../../shared/types';

const STATUS_COLORS: Record<string, string> = {
  SUCCESS:         '#7B5800',
  FAILED:          '#FCA5A5',
  PROCESSING:      '#FED7AA',
  PENDING:         '#BAE6FD',
  RETRY_EXHAUSTED: '#F87171',
};

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: 'Settled', FAILED: 'Failed',
  PROCESSING: 'Processing', PENDING: 'Pending',
  RETRY_EXHAUSTED: 'Exhausted',
};

interface Props {
  summary: TransactionSummary;
}

export default function StatusBreakdownChart({ summary }: Props) {
  const data = Object.entries(summary.byStatus)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key] ?? key,
      value,
      color: STATUS_COLORS[key] ?? '#E5E7EB',
    }));

  const successCount = summary.byStatus['SUCCESS'] ?? 0;
  const successPct = summary.total > 0 ? ((successCount / summary.total) * 100).toFixed(1) : '0';

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 32, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)' }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E', marginBottom: 24 }}>Status Breakdown</h2>

      <div style={{ height: 220, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={95} dataKey="value" paddingAngle={2}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value.toLocaleString(), name]}
              contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1C1C1E' }}>{successPct}%</div>
          <div style={{ fontSize: 11, color: '#504532', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Success</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
        {data.map((entry) => (
          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#504532' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  );
}
