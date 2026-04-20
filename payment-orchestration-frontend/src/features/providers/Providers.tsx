import { Switch, message } from 'antd';
import { useProviders, useToggleProvider } from './hooks/useProviders';
import type { ProviderConfig } from '../../shared/types/provider';

const PROVIDER_META: Record<string, {
  label: string;
  region: string;
  methods: string;
  webhook: string;
  color: string;
  bg: string;
  icon: string;
}> = {
  BILLPLZ: {
    label: 'Billplz',
    region: 'Malaysia (MY)',
    methods: 'FPX Bank Transfer',
    webhook: 'HMAC-SHA256',
    color: '#7B5800',
    bg: 'rgba(252,185,0,0.1)',
    icon: 'account_balance',
  },
  MIDTRANS: {
    label: 'Midtrans',
    region: 'Indonesia (ID)',
    methods: 'Virtual Account, QRIS',
    webhook: 'HMAC-SHA256',
    color: '#065F46',
    bg: 'rgba(6,95,70,0.08)',
    icon: 'account_balance',
  },
  PAYMONGO: {
    label: 'PayMongo',
    region: 'Philippines (PH)',
    methods: 'Maya, Cards, E-Wallets',
    webhook: 'RSA Signature',
    color: '#6B21A8',
    bg: 'rgba(107,33,168,0.08)',
    icon: 'account_balance',
  },
  MOCK: {
    label: 'Mock Provider',
    region: 'All Regions',
    methods: 'Configurable (any)',
    webhook: 'Always passes',
    color: '#374151',
    bg: 'rgba(55,65,81,0.06)',
    icon: 'science',
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Providers() {
  const { data: providers = [], isFetching } = useProviders();
  const toggleMutation = useToggleProvider();

  async function handleToggle(provider: string, enabled: boolean) {
    await toggleMutation.mutateAsync({ provider, enabled });
    message.success(`${PROVIDER_META[provider]?.label ?? provider} ${enabled ? 'enabled' : 'disabled'}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>Providers</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
          Manage payment gateways. Disabled providers are excluded from routing decisions.
        </p>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {isFetching && providers.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                background: '#FFFFFF', borderRadius: 20, padding: 28,
                boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)',
                height: 200, opacity: 0.4,
              }} />
            ))
          : providers.map((p: ProviderConfig) => {
              const meta = PROVIDER_META[p.provider] ?? {
                label: p.provider, region: '—', methods: '—',
                webhook: '—', color: '#6B7280', bg: '#F3F4F6', icon: 'account_balance',
              };

              return (
                <div
                  key={p.provider}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    padding: 28,
                    boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)',
                    border: `1px solid ${p.enabled ? 'rgba(252,185,0,0.15)' : '#F3F4F6'}`,
                    opacity: p.enabled ? 1 : 0.65,
                    transition: 'opacity 0.2s, border-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                  }}
                >
                  {/* Card header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: meta.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: meta.color }}>
                          {meta.icon}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1C1E' }}>{meta.label}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{meta.region}</div>
                      </div>
                    </div>

                    <Switch
                      checked={p.enabled}
                      loading={toggleMutation.isPending}
                      onChange={(checked) => handleToggle(p.provider, checked)}
                      style={p.enabled ? { background: '#FCB900' } : {}}
                    />
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Fee Rate', value: `${(Number(p.feePercentage) * 100).toFixed(2)}%`, icon: 'percent' },
                      { label: 'Webhook', value: p.webhookSecret ? 'Configured' : 'Not set', icon: 'webhook' },
                      { label: 'Status', value: p.enabled ? 'Active' : 'Disabled', icon: 'circle' },
                    ].map(({ label, value, icon }) => (
                      <div key={label} style={{
                        background: '#F6F3F5', borderRadius: 12, padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#9CA3AF' }}>{icon}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {label}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px solid #F6F3F5' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {meta.methods.split(', ').map((m) => (
                        <span key={m} style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11,
                          fontWeight: 500, background: meta.bg, color: meta.color,
                        }}>
                          {m}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0, marginLeft: 12 }}>
                      Updated {formatDate(p.updatedAt)}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Routing note */}
      <div style={{
        background: 'rgba(252,185,0,0.06)', borderRadius: 12, padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        border: '1px solid rgba(252,185,0,0.15)',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#7B5800', flexShrink: 0 }}>info</span>
        <span style={{ fontSize: 13, color: '#504532' }}>
          Disabling a provider removes it from all routing decisions immediately. If all providers for a region are disabled, payments to that region will fail at routing time.
        </span>
      </div>
    </div>
  );
}
