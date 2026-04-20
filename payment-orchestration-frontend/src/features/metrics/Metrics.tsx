import { useState } from 'react';
import { Select, Tag } from 'antd';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { useMetrics } from './hooks/useMetrics';
import type { ProviderMetrics } from '../../shared/types/metrics';

const WINDOW_OPTIONS = [
  { value: 60,   label: 'Last 1 hour' },
  { value: 180,  label: 'Last 3 hours' },
  { value: 360,  label: 'Last 6 hours' },
  { value: 720,  label: 'Last 12 hours' },
  { value: 1440, label: 'Last 24 hours' },
];

const PROVIDER_COLOR: Record<string, string> = {
  BILLPLZ:  '#FCB900',
  MIDTRANS: '#7B5800',
  PAYMONGO: '#9333EA',
  MOCK:     '#9CA3AF',
};

function rateColor(rate: number): string {
  if (rate >= 0.95) return '#166534';
  if (rate >= 0.80) return '#92400E';
  return '#991B1B';
}

function rateBg(rate: number): string {
  if (rate >= 0.95) return '#DCFCE7';
  if (rate >= 0.80) return '#FEF3C7';
  return '#FEE2E2';
}

function latencyColor(ms: number): string {
  if (ms <= 300) return '#166534';
  if (ms <= 700) return '#92400E';
  return '#991B1B';
}

function Bar1({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#F0EDEB', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(value * 100, 100)}%`, background: color, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 38, textAlign: 'right' }}>
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}

// Aggregate latest row per provider+region (highest id = most recent window)
function getLatest(rows: ProviderMetrics[]): ProviderMetrics[] {
  const map = new Map<string, ProviderMetrics>();
  for (const r of rows) {
    const key = `${r.provider}__${r.region}`;
    const existing = map.get(key);
    if (!existing || r.id > existing.id) map.set(key, r);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.provider.localeCompare(b.provider) || a.region.localeCompare(b.region)
  );
}

export default function Metrics() {
  const [window, setWindow] = useState(60);
  const { data: rows = [], isFetching } = useMetrics(window);

  const latest = getLatest(rows);

  // Per-provider averages for the summary cards
  const byProvider = latest.reduce<Record<string, ProviderMetrics[]>>((acc, r) => {
    (acc[r.provider] ??= []).push(r);
    return acc;
  }, {});

  // Bar chart data — success rate per provider (avg across regions)
  const barData = Object.entries(byProvider).map(([provider, rList]) => ({
    provider,
    successRate: rList.reduce((s, r) => s + Number(r.successRate), 0) / rList.length,
    avgLatency:  rList.reduce((s, r) => s + r.avgLatencyMs, 0) / rList.length,
    txCount:     rList.reduce((s, r) => s + r.transactionCount, 0),
  }));

  // Radar data — normalised scores per provider (latest, first region only as representative)
  const radarData = ['Success Rate', 'Fee Accuracy', 'Latency Score'].map((metric) => {
    const entry: Record<string, string | number> = { metric };
    for (const [provider, rList] of Object.entries(byProvider)) {
      const avg = rList.reduce((s, r) => {
        if (metric === 'Success Rate')  return s + Number(r.successRate);
        if (metric === 'Fee Accuracy')  return s + Number(r.feeAccuracyRate);
        // latency score: invert and normalise (lower latency = higher score)
        const maxLatency = 2000;
        return s + Math.max(0, 1 - r.avgLatencyMs / maxLatency);
      }, 0) / rList.length;
      entry[provider] = Math.round(avg * 100);
    }
    return entry;
  });

  const providers = Object.keys(byProvider);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>Provider Metrics</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            Performance telemetry across active routing providers. Auto-refreshes every 60 s.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isFetching && (
            <span style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync</span>
              Refreshing…
            </span>
          )}
          <Select
            value={window}
            onChange={setWindow}
            options={WINDOW_OPTIONS}
            style={{ width: 160 }}
          />
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {barData.map((p) => (
          <div key={p.provider} style={{
            background: '#FFFFFF', borderRadius: 16, padding: 20,
            boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)',
            borderTop: `3px solid ${PROVIDER_COLOR[p.provider] ?? '#E5E7EB'}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              {p.provider}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Success Rate</div>
                <Bar1 value={p.successRate} color={rateColor(p.successRate)} />
              </div>
              <div style={{ display: 'flex', justify: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Avg Latency</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: latencyColor(p.avgLatency) }}>
                    {Math.round(p.avgLatency)} ms
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Transactions</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>
                    {p.txCount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        {/* Success Rate bar chart */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', margin: '0 0 20px' }}>
            Success Rate by Provider &amp; Region
          </h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latest} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDEB" vertical={false} />
                <XAxis
                  dataKey={(r: ProviderMetrics) => `${r.provider}\n${r.region}`}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  domain={[0, 1]} tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, 'Success Rate']}
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="successRate" radius={[6, 6, 0, 0]}>
                  {latest.map((r) => (
                    <Cell key={`${r.provider}-${r.region}`} fill={PROVIDER_COLOR[r.provider] ?? '#FCB900'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar chart */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', margin: '0 0 8px' }}>
            Provider Comparison
          </h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#F0EDEB" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6B7280' }} />
                {providers.map((p) => (
                  <Radar
                    key={p}
                    name={p}
                    dataKey={p}
                    stroke={PROVIDER_COLOR[p] ?? '#9CA3AF'}
                    fill={PROVIDER_COLOR[p] ?? '#9CA3AF'}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, justifyContent: 'center' }}>
            {providers.map((p) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#504532' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: PROVIDER_COLOR[p] ?? '#9CA3AF', flexShrink: 0 }} />
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #F6F3F5' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', margin: '0 0 16px' }}>
            Detailed Metrics — {WINDOW_OPTIONS.find(o => o.value === window)?.label}
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F6F3F5' }}>
              {['Provider', 'Region', 'Success Rate', 'Fee Accuracy', 'Avg Latency', 'Transactions', 'Window'].map((h) => (
                <th key={h} style={{
                  padding: '12px 20px', textAlign: 'left',
                  fontSize: 11, fontWeight: 600, color: '#504532',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {latest.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  No metrics in this window. The aggregator runs every 15 minutes.
                </td>
              </tr>
            )}
            {latest.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F6F3F5' }}>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                    fontSize: 12, fontWeight: 700,
                    background: PROVIDER_COLOR[r.provider] ? `${PROVIDER_COLOR[r.provider]}20` : '#F3F4F6',
                    color: PROVIDER_COLOR[r.provider] ?? '#6B7280',
                  }}>
                    {r.provider}
                  </span>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <Tag style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{r.region}</Tag>
                </td>
                <td style={{ padding: '14px 20px', minWidth: 160 }}>
                  <Bar1 value={Number(r.successRate)} color={rateColor(Number(r.successRate))} />
                </td>
                <td style={{ padding: '14px 20px', minWidth: 160 }}>
                  <Bar1 value={Number(r.feeAccuracyRate)} color={rateColor(Number(r.feeAccuracyRate))} />
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: latencyColor(r.avgLatencyMs) }}>
                    {r.avgLatencyMs} ms
                  </span>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>
                    {r.transactionCount.toLocaleString()}
                  </span>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {new Date(r.windowStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(r.windowEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
