import { Switch, message } from 'antd';
import { useProviders, useToggleProvider } from './hooks/useProviders';
import type { ProviderConfig } from '../../shared/types/provider';
import NotificationQueuePanel from './NotificationQueuePanel';
import PageHeader from '../../shared/components/PageHeader';
import InfoBanner from '../../shared/components/InfoBanner';
import { formatDate } from '../../shared/utils/format';
import styles from './Providers.module.css';

const PROVIDER_META: Record<string, {
  label: string; region: string; methods: string;
  webhook: string; color: string; bg: string; icon: string;
}> = {
  BILLPLZ:  { label: 'Billplz',       region: 'Malaysia (MY)',    methods: 'FPX Bank Transfer',      webhook: 'HMAC-SHA256',   color: '#7B5800', bg: 'rgba(252,185,0,0.1)',    icon: 'account_balance' },
  MIDTRANS: { label: 'Midtrans',       region: 'Indonesia (ID)',   methods: 'Virtual Account, QRIS',  webhook: 'HMAC-SHA256',   color: '#065F46', bg: 'rgba(6,95,70,0.08)',     icon: 'account_balance' },
  PAYMONGO: { label: 'PayMongo',       region: 'Philippines (PH)', methods: 'Maya, Cards, E-Wallets', webhook: 'RSA Signature', color: '#6B21A8', bg: 'rgba(107,33,168,0.08)', icon: 'account_balance' },
  MOCK:     { label: 'Mock Provider',  region: 'All Regions',      methods: 'Configurable (any)',     webhook: 'Always passes', color: '#374151', bg: 'rgba(55,65,81,0.06)',    icon: 'science' },
};

function ProviderCard({ p }: { p: ProviderConfig }) {
  const toggleMutation = useToggleProvider();
  const meta = PROVIDER_META[p.provider] ?? {
    label: p.provider, region: '—', methods: '—',
    webhook: '—', color: '#6B7280', bg: '#F3F4F6', icon: 'account_balance',
  };

  const stats = [
    { label: 'Fee Rate', value: `${(Number(p.feePercentage) * 100).toFixed(2)}%`, icon: 'percent' },
    { label: 'Webhook',  value: p.webhookSecret ? 'Configured' : 'Not set',        icon: 'webhook' },
    { label: 'Status',   value: p.enabled ? 'Active' : 'Disabled',                 icon: 'circle'  },
  ];

  return (
    <div className={`${styles.card} ${p.enabled ? styles.cardEnabled : styles.cardDisabled}`}>
      <div className={styles.cardHeader}>
        <div className={styles.iconAndMeta}>
          {/* bg/color are provider metadata — data-driven, inline justified */}
          <div className={styles.iconWrap} style={{ background: meta.bg }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: meta.color }}>
              {meta.icon}
            </span>
          </div>
          <div>
            <div className={styles.providerName}>{meta.label}</div>
            <div className={styles.providerRegion}>{meta.region}</div>
          </div>
        </div>
        {/* Switch amber when active — theming a 3rd-party component */}
        <Switch
          checked={p.enabled}
          loading={toggleMutation.isPending}
          onChange={(checked) => {
            toggleMutation.mutateAsync({ provider: p.provider, enabled: checked });
            message.success(`${meta.label} ${checked ? 'enabled' : 'disabled'}`);
          }}
          style={p.enabled ? { background: '#FCB900' } : {}}
        />
      </div>

      <div className={styles.statsGrid}>
        {stats.map(({ label, value, icon }) => (
          <div key={label} className={styles.statBox}>
            <div className={styles.statLabelRow}>
              <span className={`material-symbols-outlined ${styles.statIcon}`}>{icon}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
            <div className={styles.statValue}>{value}</div>
          </div>
        ))}
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.methodPills}>
          {meta.methods.split(', ').map((m) => (
            /* bg/color from provider meta — data-driven, inline justified */
            <span key={m} className={styles.methodPill} style={{ background: meta.bg, color: meta.color }}>
              {m}
            </span>
          ))}
        </div>
        <div className={styles.updatedAt}>Updated {formatDate(p.updatedAt)}</div>
      </div>
    </div>
  );
}

export default function Providers() {
  const { data: providers = [], isFetching } = useProviders();

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
          : providers.map((p: ProviderConfig) => (
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
