import { Switch, message } from 'antd';
import { useProviderSummaries, useToggleProvider } from './hooks/useProviders';
import type { ProviderSummary } from '../../shared/types/provider';
import NotificationQueuePanel from './NotificationQueuePanel';
import PageHeader from '../../shared/components/PageHeader';
import InfoBanner from '../../shared/components/InfoBanner';
import { formatDate } from '../../shared/utils/format';
import { isAdmin } from '../../lib/role';
import styles from './Providers.module.css';

const REGION_LABEL: Record<string, string> = {
  MY: 'Malaysia (MY)',
  ID: 'Indonesia (ID)',
  PH: 'Philippines (PH)',
};

const DISPLAY: Record<string, { color: string; bg: string; icon: string }> = {
  BILLPLZ:  { color: '#7B5800', bg: 'rgba(252,185,0,0.1)',    icon: 'account_balance' },
  MIDTRANS: { color: '#065F46', bg: 'rgba(6,95,70,0.08)',     icon: 'account_balance' },
  PAYMONGO: { color: '#6B21A8', bg: 'rgba(107,33,168,0.08)', icon: 'account_balance' },
  XENDIT:   { color: '#1D4ED8', bg: 'rgba(29,78,216,0.08)',  icon: 'account_balance' },
  MOCK:     { color: '#374151', bg: 'rgba(55,65,81,0.06)',    icon: 'science' },
};

function successRateColor(rate: number | null): string {
  if (rate === null) return 'var(--text-muted)';
  if (rate >= 0.8)  return '#166534';
  if (rate >= 0.5)  return '#7B5800';
  return '#991B1B';
}

function ProviderCard({ p }: { p: ProviderSummary }) {
  const toggleMutation = useToggleProvider();
  const display = DISPLAY[p.provider] ?? { color: '#6B7280', bg: '#F3F4F6', icon: 'account_balance' };

  const regionLabel = p.regions.length > 1
    ? 'All Regions'
    : (REGION_LABEL[p.regions[0]] ?? p.regions[0]);

  const srColor = successRateColor(p.successRate);

  const stats = [
    {
      label: 'Success Rate',
      value: p.successRate !== null ? `${(p.successRate * 100).toFixed(1)}%` : '—',
      icon: 'trending_up',
      color: srColor,
    },
    {
      label: 'Avg Latency',
      value: p.avgLatencyMs !== null ? `${p.avgLatencyMs}ms` : '—',
      icon: 'timer',
      color: 'var(--text-primary)',
    },
    {
      label: 'Transactions',
      value: p.transactionCount !== null ? p.transactionCount.toLocaleString() : '—',
      icon: 'receipt_long',
      color: 'var(--text-primary)',
    },
  ];

  return (
    <div className={`${styles.card} ${p.enabled ? styles.cardEnabled : styles.cardDisabled}`}>
      <div className={styles.cardHeader}>
        <div className={styles.iconAndMeta}>
          <div className={styles.iconWrap} style={{ background: display.bg }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: display.color }}>
              {display.icon}
            </span>
          </div>
          <div>
            <div className={styles.providerName}>{p.label}</div>
            <div className={styles.providerRegion}>{regionLabel}</div>
          </div>
        </div>
        <Switch
          checked={p.enabled}
          loading={toggleMutation.isPending}
          disabled={!isAdmin()}
          onChange={(checked) => {
            toggleMutation.mutateAsync({ provider: p.provider, enabled: checked });
            message.success(`${p.label} ${checked ? 'enabled' : 'disabled'}`);
          }}
          style={p.enabled ? { background: '#FCB900' } : {}}
        />
      </div>

      <div className={styles.statsGrid}>
        {stats.map(({ label, value, icon, color }) => (
          <div key={label} className={styles.statBox}>
            <div className={styles.statLabelRow}>
              <span className={`material-symbols-outlined ${styles.statIcon}`}>{icon}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
            <div className={styles.statValue} style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.methodPills}>
          {p.supportedMethods.length > 0
            ? p.supportedMethods.map((m) => (
                <span key={m} className={styles.methodPill} style={{ background: display.bg, color: display.color }}>
                  {m}
                </span>
              ))
            : <span className={styles.methodPill} style={{ background: '#F3F4F6', color: '#6B7280' }}>No methods</span>
          }
        </div>
        <div className={styles.webhookAndDate}>
          <span className={styles.webhookTag}>{p.webhookType}</span>
          <span className={styles.updatedAt}>Updated {formatDate(p.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Providers() {
  const { data: providers = [], isFetching } = useProviderSummaries();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Providers"
        subtitle="Manage payment gateways. Disabled providers are excluded from routing decisions."
      />

      <div className={styles.grid}>
        {isFetching && providers.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))
          : providers.map((p: ProviderSummary) => (
              <ProviderCard key={p.provider} p={p} />
            ))
        }
      </div>

      <InfoBanner>
        Disabling a provider removes it from all routing decisions immediately. If all providers
        for a region are disabled, payments to that region will fail at routing time.
      </InfoBanner>

      <NotificationQueuePanel />
    </div>
  );
}
