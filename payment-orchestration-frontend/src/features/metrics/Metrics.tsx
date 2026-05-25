import { useState } from 'react';
import { Select, Tag } from 'antd';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { useMetrics } from './hooks/useMetrics';
import { useProviderSummaries } from '../providers/hooks/useProviders';
import type { ProviderMetrics } from '../../shared/types/metrics';
import PageHeader from '../../shared/components/PageHeader';
import { PROVIDER_BADGE_CONFIG } from '../../shared/constants/providerStyles';
import styles from './Metrics.module.css';

const WINDOW_OPTIONS = [
  { value: 60,   label: 'Last 1 hour' },
  { value: 180,  label: 'Last 3 hours' },
  { value: 360,  label: 'Last 6 hours' },
  { value: 720,  label: 'Last 12 hours' },
  { value: 1440, label: 'Last 24 hours' },
];

function rateColor(rate: number): string {
  if (rate >= 0.95) return '#166534';
  if (rate >= 0.80) return '#92400E';
  return '#991B1B';
}

function latencyColor(ms: number): string {
  if (ms <= 300) return '#166534';
  if (ms <= 700) return '#92400E';
  return '#991B1B';
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className={styles.miniBarRoot}>
      <div className={styles.miniBarTrack}>
        {/* width and fill color are data-driven — inline justified */}
        <div className={styles.miniBarFill} style={{ width: `${Math.min(value * 100, 100)}%`, background: color }} />
      </div>
      <span className={styles.miniBarLabel} style={{ color }}>
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}

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

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function Metrics() {
  const [windowMins, setWindowMins] = useState(60);
  const { data: rows = [], isFetching } = useMetrics(windowMins);
  const { data: fallbackRows = [] } = useMetrics(10080);
  const { data: summaries = [] } = useProviderSummaries();

  const latest = getLatest(rows);
  const fallbackLatest = getLatest(fallbackRows);
  const isFallback = latest.length === 0 && fallbackLatest.length > 0;
  const displayRows = isFallback ? fallbackLatest : latest;

  const lastRecordedAt = isFallback && fallbackLatest.length > 0
    ? new Date(Math.max(...fallbackLatest.map(r => new Date(r.windowEnd).getTime())))
    : null;

  const currentWindowLabel = WINDOW_OPTIONS.find(o => o.value === windowMins)?.label ?? '';

  const byProvider = displayRows.reduce<Record<string, ProviderMetrics[]>>((acc, r) => {
    (acc[r.provider] ??= []).push(r);
    return acc;
  }, {});

  const barData = Object.entries(byProvider).map(([provider, rList]) => ({
    provider,
    successRate: rList.reduce((s, r) => s + Number(r.successRate), 0) / rList.length,
    avgLatency:  rList.reduce((s, r) => s + r.avgLatencyMs, 0) / rList.length,
    txCount:     rList.reduce((s, r) => s + r.transactionCount, 0),
  }));

  const radarData = ['Success Rate', 'Fee Accuracy', 'Latency Score'].map((metric) => {
    const entry: Record<string, string | number> = { metric };
    for (const [provider, rList] of Object.entries(byProvider)) {
      const avg = rList.reduce((s, r) => {
        if (metric === 'Success Rate') return s + Number(r.successRate);
        if (metric === 'Fee Accuracy') return s + Number(r.feeAccuracyRate);
        const maxLatency = 2000;
        return s + Math.max(0, 1 - r.avgLatencyMs / maxLatency);
      }, 0) / rList.length;
      entry[provider] = Math.round(avg * 100);
    }
    return entry;
  });

  const providers = Object.keys(byProvider);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Provider Metrics"
        subtitle="Performance telemetry across active routing providers. Auto-refreshes every 60 s."
        actions={
          <div className={styles.headerRight}>
            {isFetching && (
              <span className={styles.refreshing}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync</span>
                Refreshing…
              </span>
            )}
            <Select
              value={windowMins}
              onChange={setWindowMins}
              options={WINDOW_OPTIONS}
              style={{ width: 160 }}
            />
          </div>
        }
      />

      {/* Fallback banner */}
      {isFallback && lastRecordedAt && (
        <div className={styles.fallbackBanner}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>history</span>
          <span>
            No transactions in the <strong>{currentWindowLabel.toLowerCase()}</strong> — showing last recorded snapshot
            <span className={styles.fallbackAge}>{timeAgo(lastRecordedAt)}</span>
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className={styles.summaryGrid}>
        {barData.map((p) => {
          const providerColor = PROVIDER_BADGE_CONFIG[p.provider]?.color ?? '#E5E7EB';
          return (
            <div key={p.provider} className={styles.summaryCard} style={{ borderTop: `3px solid ${providerColor}` }}>
              <div className={styles.summaryCardLabel}>{p.provider}</div>
              <div className={styles.summaryCardBody}>
                <div>
                  <div className={styles.metricLabel}>Success Rate</div>
                  <MiniBar value={p.successRate} color={rateColor(p.successRate)} />
                </div>
                <div className={styles.statsRow}>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Avg Latency</div>
                    {/* color is data-driven — inline justified */}
                    <div className={styles.statValue} style={{ color: latencyColor(p.avgLatency) }}>
                      {Math.round(p.avgLatency)} ms
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Transactions</div>
                    <div className={styles.statValue}>{p.txCount.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Success Rate by Provider &amp; Region</h3>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayRows} barCategoryGap="30%">
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
                  {displayRows.map((r) => (
                    /* fill is provider-driven — inline justified */
                    <Cell key={`${r.provider}-${r.region}`} fill={PROVIDER_BADGE_CONFIG[r.provider]?.color ?? '#FCB900'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitleCompact}>Provider Comparison</h3>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#F0EDEB" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6B7280' }} />
                {providers.map((p) => {
                  const color = PROVIDER_BADGE_CONFIG[p]?.color ?? '#9CA3AF';
                  return (
                    /* stroke/fill are provider-driven — inline justified */
                    <Radar
                      key={p}
                      name={p}
                      dataKey={p}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  );
                })}
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.chartLegend}>
            {providers.map((p) => {
              const color = PROVIDER_BADGE_CONFIG[p]?.color ?? '#9CA3AF';
              return (
                <div key={p} className={styles.legendItem}>
                  {/* background is provider-driven — inline justified */}
                  <span className={styles.legendDot} style={{ background: color }} />
                  {p}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div className={styles.detailCard}>
        <div className={styles.detailHeader}>
          <h3 className={styles.detailTitle}>
            Detailed Metrics — {isFallback ? 'Last Recorded Snapshot' : currentWindowLabel}
          </h3>
        </div>
        <table className={styles.detailTable}>
          <thead>
            <tr className={styles.detailHeadRow}>
              {['Provider', 'Region', 'Success Rate', 'Fee Accuracy', 'Avg Latency', 'Transactions', 'Window'].map((h) => (
                <th key={h} className={styles.detailTh}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.emptyCell}>
                  No metrics in this window. The aggregator runs every 15 minutes.
                </td>
              </tr>
            )}
            {displayRows.map((r) => {
              const cfg = PROVIDER_BADGE_CONFIG[r.provider];
              /* bg/color are provider-driven — inline justified */
              const providerColor = cfg?.color ?? '#6B7280';
              const providerBg = cfg ? `${cfg.color}20` : '#F3F4F6';
              return (
                <tr key={r.id} className={styles.detailRow}>
                  <td className={styles.detailTd}>
                    <span className={styles.cellProvider} style={{ background: providerBg, color: providerColor }}>
                      {r.provider}
                    </span>
                  </td>
                  <td className={styles.detailTd}>
                    <Tag style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{r.region}</Tag>
                  </td>
                  <td className={styles.detailTdWide}>
                    <MiniBar value={Number(r.successRate)} color={rateColor(Number(r.successRate))} />
                  </td>
                  <td className={styles.detailTdWide}>
                    <MiniBar value={Number(r.feeAccuracyRate)} color={rateColor(Number(r.feeAccuracyRate))} />
                  </td>
                  <td className={styles.detailTd}>
                    {/* color is data-driven — inline justified */}
                    <span className={styles.cellLatency} style={{ color: latencyColor(r.avgLatencyMs) }}>
                      {r.avgLatencyMs} ms
                    </span>
                  </td>
                  <td className={styles.detailTd}>
                    <span className={styles.cellTxCount}>{r.transactionCount.toLocaleString()}</span>
                  </td>
                  <td className={styles.detailTd}>
                    <span className={styles.cellWindow}>
                      {new Date(r.windowStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(r.windowEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Provider Capability Matrix */}
      <div className={styles.matrixCard}>
        <div className={styles.matrixHeader}>
          <h3 className={styles.matrixTitle}>Provider Capability Matrix</h3>
          <p className={styles.matrixSubtitle}>Region coverage and supported methods — always available regardless of transaction volume</p>
        </div>
        <table className={styles.matrixTable}>
          <thead>
            <tr className={styles.detailHeadRow}>
              {['Provider', 'Status', 'Region Coverage', 'Payment Methods', 'All-time Success', 'Total Tx'].map((h) => (
                <th key={h} className={styles.detailTh}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaries.filter(s => s.provider !== 'MOCK').map((s) => {
              const cfg = PROVIDER_BADGE_CONFIG[s.provider];
              const providerColor = cfg?.color ?? '#6B7280';
              const providerBg = cfg ? `${cfg.color}20` : '#F3F4F6';
              return (
                <tr key={s.provider} className={styles.detailRow}>
                  <td className={styles.detailTd}>
                    <div className={styles.matrixProviderCell}>
                      {/* bg/color are provider-driven — inline justified */}
                      <span className={styles.cellProvider} style={{ background: providerBg, color: providerColor }}>
                        {s.provider}
                      </span>
                      <span className={styles.matrixProviderLabel}>{s.label}</span>
                    </div>
                  </td>
                  <td className={styles.detailTd}>
                    <span className={s.enabled ? styles.statusActive : styles.statusInactive}>
                      {s.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className={styles.detailTd}>
                    <div className={styles.tagList}>
                      {s.regions.map((r) => (
                        <Tag key={r} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{r}</Tag>
                      ))}
                    </div>
                  </td>
                  <td className={styles.detailTd}>
                    <div className={styles.methodTagList}>
                      {s.supportedMethods.map((m) => (
                        <span key={m} className={styles.methodTag}>{m}</span>
                      ))}
                    </div>
                  </td>
                  <td className={styles.detailTdWide}>
                    {s.successRate != null
                      ? <MiniBar value={s.successRate} color={rateColor(s.successRate)} />
                      : <span className={styles.cellWindow}>No data yet</span>
                    }
                  </td>
                  <td className={styles.detailTd}>
                    <span className={styles.cellTxCount}>
                      {s.transactionCount != null ? s.transactionCount.toLocaleString() : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
