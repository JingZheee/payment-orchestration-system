import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TransactionSummary } from '../../../shared/types';

const PROVIDER_COLORS: Record<string, string> = {
  BILLPLZ:  '#FCB900',
  MIDTRANS: '#7B5800',
  PAYMONGO: '#e0a400',
  MOCK:     '#D4C4AB',
};

interface Props {
  summary: TransactionSummary;
}

export default function VolumeByProviderChart({ summary }: Props) {
  const data = Object.entries(summary.byProvider)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: key, value }));

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 32, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)' }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E', marginBottom: 24 }}>Volume by Provider</h2>

      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="35%">
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#504532' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip
              cursor={{ fill: 'rgba(252,185,0,0.05)' }}
              formatter={(value: number) => [value.toLocaleString(), 'Transactions']}
              contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={PROVIDER_COLORS[entry.name] ?? '#FCB900'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
