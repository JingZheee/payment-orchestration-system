import { useState } from 'react';
import { Select, InputNumber, Button, Spin, Tag, Tooltip } from 'antd';
import { useProviderScores } from '../dashboard/hooks/useProviderScores';
import { useStrategyComparison } from '../dashboard/hooks/useStrategyComparison';
import { Region, Currency, RoutingStrategy, PaymentType, Provider } from '../../shared/types/enums';
import type { ScoreDetail } from '../../shared/types/dashboard';
import type { ScoreParams, CompareParams } from '../dashboard/services/dashboardService';

// ── Constants ────────────────────────────────────────────────────────────────

const REGION_CURRENCY: Record<Region, Currency> = {
  [Region.MY]: Currency.MYR,
  [Region.ID]: Currency.IDR,
  [Region.PH]: Currency.PHP,
};

const CURRENCY_PREFIX: Record<Currency, string> = {
  [Currency.MYR]: 'RM',
  [Currency.IDR]: 'Rp',
  [Currency.PHP]: '₱',
};

const STRATEGY_META: Record<RoutingStrategy, { name: string; description: string }> = {
  [RoutingStrategy.REGION_BASED]:    { name: 'Region-Based Override',  description: 'Forces preferred local acquirer from routing rules' },
  [RoutingStrategy.LOWEST_FEE]:      { name: 'Lowest Fee Optimizer',   description: 'Selects provider with lowest calculated fee' },
  [RoutingStrategy.SUCCESS_RATE]:    { name: 'Success Rate Focus',     description: 'Selects provider with highest historical approval rate' },
  [RoutingStrategy.COMPOSITE_SCORE]: { name: 'Smart Composite Score',  description: 'Balances all 4 factors using weighted scoring formula' },
};

const STRATEGY_ORDER = [
  RoutingStrategy.REGION_BASED,
  RoutingStrategy.LOWEST_FEE,
  RoutingStrategy.SUCCESS_RATE,
  RoutingStrategy.COMPOSITE_SCORE,
];

// Providers per region — used to compute excluded providers
const REGION_PROVIDERS: Record<Region, Provider[]> = {
  [Region.MY]: [Provider.BILLPLZ, Provider.MOCK],
  [Region.ID]: [Provider.MIDTRANS, Provider.MOCK],
  [Region.PH]: [Provider.XENDIT, Provider.MOCK],
};

const DISBURSEMENT_CAPABLE = new Set([Provider.XENDIT, Provider.MOCK]);

const SCORER_WEIGHTS = [
  {
    label: 'Success Rate',
    weight: 40,
    icon: 'check_circle',
    color: '#15803D',
    bg: 'rgba(134,239,172,0.12)',
    description: 'Historical payment approval rate for this provider in the selected region. Defaults to 50% when no recent data.',
    field: 'srComponent' as keyof ScoreDetail,
    rawLabel: (d: ScoreDetail) => `${(d.successRate * 100).toFixed(1)}%`,
  },
  {
    label: 'Fee Score',
    weight: 25,
    icon: 'percent',
    color: '#1D4ED8',
    bg: 'rgba(147,197,253,0.12)',
    description: 'Inverse of normalized fee relative to other eligible providers. Lower fee = higher score.',
    field: 'feeComponent' as keyof ScoreDetail,
    rawLabel: (d: ScoreDetail, currency: Currency) => `${CURRENCY_PREFIX[currency]} ${Number(d.rawFee).toFixed(2)}`,
  },
  {
    label: 'Latency',
    weight: 15,
    icon: 'speed',
    color: '#7C3AED',
    bg: 'rgba(196,181,253,0.12)',
    description: 'Inverse of normalized average response time. Faster provider response = higher score.',
    field: 'latencyComponent' as keyof ScoreDetail,
    rawLabel: (d: ScoreDetail) => `${d.latencyMs}ms`,
  },
  {
    label: 'Fee Accuracy',
    weight: 20,
    icon: 'balance',
    color: '#B45309',
    bg: 'rgba(252,185,0,0.12)',
    description: 'Match between quoted fees and actual fees from reconciliation data. High accuracy = provider is predictable.',
    field: 'accuracyComponent' as keyof ScoreDetail,
    rawLabel: (d: ScoreDetail) => `${(d.feeAccuracy * 100).toFixed(1)}%`,
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function WeightCard({
  label, weight, icon, color, bg, description,
}: { label: string; weight: number; icon: string; color: string; bg: string; description: string }) {
  return (
    <Tooltip title={description} placement="bottom">
      <div style={{
        flex: 1, background: bg, borderRadius: 14, padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 10, cursor: 'default',
        border: '1px solid rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color }}>{icon}</span>
          <span style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{weight}%</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{label}</div>
        <div style={{ height: 4, borderRadius: 999, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${weight}%`, background: color, borderRadius: 999 }} />
        </div>
      </div>
    </Tooltip>
  );
}

function SubScoreRow({
  label, component, rawLabel, weight, color,
}: { label: string; component: number; rawLabel: string; weight: number; color: string }) {
  const pct = Math.round(component * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 90, fontSize: 11, color: '#6B7280', fontWeight: 500, flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF', width: 72, flexShrink: 0, fontFamily: 'monospace' }}>{rawLabel}</div>
      <div style={{ flex: 1, height: 5, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color, width: 34, textAlign: 'right', flexShrink: 0 }}>
        {component.toFixed(2)}
      </div>
      <div style={{ fontSize: 10, color: '#9CA3AF', width: 38, flexShrink: 0 }}>×{(weight / 100).toFixed(2)}</div>
    </div>
  );
}

function ProviderScoreCard({
  detail, isWinner, currency,
}: { detail: ScoreDetail; isWinner: boolean; currency: Currency }) {
  const totalPct = Math.round(detail.totalScore * 100);
  const PROVIDER_COLORS: Record<string, string> = {
    BILLPLZ: '#0070C0', MIDTRANS: '#003087', XENDIT: '#007CF0', MOCK: '#374151',
  };
  const providerColor = PROVIDER_COLORS[detail.provider] ?? '#374151';

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 12,
      padding: '20px 24px',
      border: isWinner ? '2px solid #FCB900' : '1px solid #F3F4F6',
      boxShadow: isWinner ? '0 0 0 4px rgba(252,185,0,0.08)' : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: `${providerColor}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: providerColor }}>{detail.provider.slice(0, 2)}</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1C1C1E' }}>{detail.provider}</div>
            {isWinner && (
              <Tag style={{ fontSize: 10, borderRadius: 999, border: 'none', background: 'rgba(252,185,0,0.15)', color: '#7B5800', fontWeight: 700, marginTop: 2 }}>
                SELECTED
              </Tag>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: isWinner ? '#7B5800' : '#1C1C1E' }}>
            {totalPct}
          </div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>/ 100</div>
        </div>
      </div>

      {/* Total score bar */}
      <div style={{ height: 8, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{
          height: '100%', width: `${totalPct}%`, borderRadius: 999,
          background: isWinner ? 'linear-gradient(90deg, #FCB900, #e0a400)' : 'linear-gradient(90deg, #94A3B8, #64748B)',
        }} />
      </div>

      {/* Sub-score breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SCORER_WEIGHTS.map(w => (
          <SubScoreRow
            key={w.label}
            label={w.label}
            component={Number(detail[w.field])}
            rawLabel={w.rawLabel(detail, currency)}
            weight={w.weight}
            color={w.color}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

interface SimParams extends ScoreParams, CompareParams {}

export default function RoutingEnginePage() {
  const [region, setRegion] = useState<Region>(Region.MY);
  const [amount, setAmount] = useState<number>(1500);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.PREMIUM_COLLECTION);
  const [simParams, setSimParams] = useState<SimParams | null>(null);

  const currency = REGION_CURRENCY[region];

  const scoresQuery = useProviderScores(simParams);
  const comparisonQuery = useStrategyComparison(simParams);

  const isLoading = scoresQuery.isFetching || comparisonQuery.isFetching;
  const hasResults = !!simParams && !isLoading;

  const scores = scoresQuery.data ?? [];
  const winner = scores[0];

  // Providers excluded due to payment type
  const eligibleProviderNames = new Set(scores.map(s => s.provider));
  const excludedProviders = simParams
    ? REGION_PROVIDERS[simParams.region]?.filter(p => !eligibleProviderNames.has(p)) ?? []
    : [];

  function runSimulation() {
    setSimParams({ region, amount, currency, paymentType });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Header ── */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>Routing Engine</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
          Understand how the orchestration engine selects payment providers — simulate scenarios and inspect the composite scoring formula.
        </p>
      </div>

      {/* ── Section 1: Scorer Weights ── */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, border: '1px solid #F3F4F6' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Composite Score Formula</h2>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 4, margin: 0, marginTop: 4 }}>
            Every eligible provider is scored using a weighted formula. Hover a card to see what each factor measures.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {SCORER_WEIGHTS.map(w => (
            <WeightCard key={w.label} {...w} />
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace', background: '#F9FAFB', borderRadius: 8, padding: '10px 14px' }}>
          score = (successRate × 0.40) + ((1 − normFee) × 0.25) + ((1 − normLatency) × 0.15) + (feeAccuracy × 0.20)
          &nbsp;&nbsp;·&nbsp;&nbsp;
          Weights configurable in application.yml → routing.scorer.*
        </div>
      </div>

      {/* ── Sections 2 + 3: Simulation ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Form */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Simulation Parameters</h2>

          <div>
            <label style={labelStyle}>Region</label>
            <Select
              value={region}
              onChange={v => { setRegion(v); }}
              style={{ width: '100%' }}
              options={[
                { value: Region.MY, label: '🇲🇾 Malaysia (MY)' },
                { value: Region.ID, label: '🇮🇩 Indonesia (ID)' },
                { value: Region.PH, label: '🇵🇭 Philippines (PH)' },
              ]}
            />
          </div>

          <div>
            <label style={labelStyle}>Payment Type</label>
            <Select
              value={paymentType}
              onChange={v => setPaymentType(v)}
              style={{ width: '100%' }}
              options={[
                { value: PaymentType.PREMIUM_COLLECTION, label: '💰 Premium Collection' },
                { value: PaymentType.CLAIMS_DISBURSEMENT, label: '🏥 Claims Disbursement' },
              ]}
            />
          </div>

          <div>
            <label style={labelStyle}>Amount ({CURRENCY_PREFIX[currency]})</label>
            <InputNumber
              value={amount}
              onChange={v => setAmount(v ?? 0)}
              style={{ width: '100%' }}
              min={1}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => Number(v?.replace(/,/g, '') ?? 0)}
            />
          </div>

          <div>
            <label style={labelStyle}>Currency</label>
            <Select value={currency} disabled style={{ width: '100%' }} options={[{ value: currency, label: currency }]} />
          </div>

          <Button
            type="primary"
            block
            size="large"
            loading={isLoading}
            onClick={runSimulation}
            style={{ background: 'linear-gradient(180deg,#FCB900,#e0a400)', border: 'none', color: '#261900', fontWeight: 700, borderRadius: 10 }}
          >
            Run Simulation
          </Button>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!simParams && (
            <div style={{
              background: '#FFFFFF', borderRadius: 16, border: '1px solid #F3F4F6',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: 64, gap: 12, color: '#9CA3AF',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>route</span>
              <p style={{ fontSize: 14, margin: 0 }}>Set parameters and run a simulation to see provider scores.</p>
            </div>
          )}

          {isLoading && (
            <div style={{
              background: '#FFFFFF', borderRadius: 16, border: '1px solid #F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64,
            }}>
              <Spin size="large" />
            </div>
          )}

          {hasResults && scores.length === 0 && (
            <div style={{
              background: '#FFFFFF', borderRadius: 16, border: '1px solid #FCA5A5',
              padding: 24, color: '#991B1B', fontSize: 14,
            }}>
              No eligible providers found for the selected region and payment type.
            </div>
          )}

          {hasResults && scores.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Eligible Providers — sorted by composite score
              </div>
              {scores.map((detail, i) => (
                <ProviderScoreCard
                  key={detail.provider}
                  detail={detail}
                  isWinner={i === 0}
                  currency={currency}
                />
              ))}

              {excludedProviders.length > 0 && (
                <div style={{
                  background: '#FFF7ED', borderRadius: 12, padding: '14px 18px',
                  border: '1px solid #FED7AA',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Excluded Providers
                  </div>
                  {excludedProviders.map(p => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#78350F', marginBottom: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#F97316' }}>block</span>
                      <strong>{p}</strong>
                      <span style={{ color: '#9CA3AF' }}>—</span>
                      <span>
                        {!DISBURSEMENT_CAPABLE.has(p)
                          ? 'Does not support CLAIMS_DISBURSEMENT (collection-only provider)'
                          : 'Unavailable or disabled'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Section 4: Strategy Comparison ── */}
      {hasResults && comparisonQuery.data && (
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, border: '1px solid #F3F4F6' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: 0, marginBottom: 6 }}>Strategy Comparison</h2>
          <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 20px' }}>
            What each routing strategy would select for the same scenario.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                {['Strategy', 'Selected Provider', 'Reason'].map(h => (
                  <th key={h} style={{ paddingBottom: 12, textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STRATEGY_ORDER.map(strategy => {
                const row = comparisonQuery.data?.find(c => c.strategy === strategy);
                const meta = STRATEGY_META[strategy];
                const isComposite = strategy === RoutingStrategy.COMPOSITE_SCORE;
                return (
                  <tr key={strategy} style={{ borderBottom: '1px solid #F9FAFB' }}>
                    <td style={{ padding: '14px 16px 14px 0', width: 220 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1C1C1E' }}>{meta.name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{meta.description}</div>
                    </td>
                    <td style={{ padding: '14px 16px 14px 0', width: 160 }}>
                      {row ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                          background: isComposite ? 'rgba(252,185,0,0.15)' : '#F3F4F6',
                          color: isComposite ? '#7B5800' : '#374151',
                          border: isComposite ? '1px solid rgba(252,185,0,0.4)' : 'none',
                        }}>
                          {row.selectedProvider}
                        </span>
                      ) : <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 0', fontSize: 12, color: '#6B7280' }}>
                      {row?.reason ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: '#6B7280', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 8,
};
