import { useState } from 'react';
import { Select, InputNumber, Button, Spin } from 'antd';
import { useProviderScores } from '../hooks/useProviderScores';
import { useStrategyComparison } from '../hooks/useStrategyComparison';
import { Region, Currency, RoutingStrategy } from '../../../shared/types';
import type { ScoreDetail } from '../../../shared/types';

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
  [RoutingStrategy.REGION_BASED]:    { name: 'Region-Based Override',  description: 'Forces local acquirer' },
  [RoutingStrategy.LOWEST_FEE]:      { name: 'Lowest Fee Optimizer',   description: 'Prioritizes margin' },
  [RoutingStrategy.SUCCESS_RATE]:    { name: 'Success Rate Focus',     description: 'Minimizes declines' },
  [RoutingStrategy.COMPOSITE_SCORE]: { name: 'Smart Composite Score',  description: 'Balanced AI routing' },
};

const STRATEGY_ORDER = [
  RoutingStrategy.REGION_BASED,
  RoutingStrategy.LOWEST_FEE,
  RoutingStrategy.SUCCESS_RATE,
  RoutingStrategy.COMPOSITE_SCORE,
];

interface SimParams { region: Region; amount: number; currency: Currency; }

export default function RoutingIntelligencePanel() {
  const [region, setRegion] = useState<Region>(Region.MY);
  const [amount, setAmount] = useState<number>(1500);
  const [simParams, setSimParams] = useState<SimParams | null>(null);

  const currency = REGION_CURRENCY[region];

  const scoresQuery = useProviderScores(simParams);
  const comparisonQuery = useStrategyComparison(simParams);

  const isLoading = scoresQuery.isFetching || comparisonQuery.isFetching;
  const hasResults = !!simParams && !isLoading && comparisonQuery.data;

  const getScoreForProvider = (provider: string): ScoreDetail | undefined =>
    scoresQuery.data?.find((s) => s.provider === provider);

  function runSimulation() {
    setSimParams({ region, amount, currency });
  }

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 32, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>Live Routing Intelligence</h2>
        <p style={{ color: '#504532', fontSize: 13, marginTop: 4 }}>Simulate routing logic based on current network conditions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32 }}>
        {/* ── Simulation form ── */}
        <div style={{ background: '#F6F3F5', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: '#504532', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
            Simulation Parameters
          </h3>

          <div>
            <label style={labelStyle}>Region</label>
            <Select
              value={region}
              onChange={(v) => setRegion(v)}
              style={{ width: '100%' }}
              options={[
                { value: Region.MY, label: 'Malaysia (MY)' },
                { value: Region.ID, label: 'Indonesia (ID)' },
                { value: Region.PH, label: 'Philippines (PH)' },
              ]}
            />
          </div>

          <div>
            <label style={labelStyle}>Amount ({CURRENCY_PREFIX[currency]})</label>
            <InputNumber
              value={amount}
              onChange={(v) => setAmount(v ?? 0)}
              style={{ width: '100%' }}
              min={1}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
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
            style={{ marginTop: 4, background: 'linear-gradient(180deg,#FCB900,#e0a400)', border: 'none', color: '#261900', fontWeight: 600, borderRadius: 10 }}
          >
            Run Simulation
          </Button>
        </div>

        {/* ── Results table ── */}
        <div>
          {!hasResults && !isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#9CA3AF' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.4 }}>route</span>
              <p style={{ fontSize: 13 }}>Set parameters and run simulation to see routing results.</p>
            </div>
          )}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Spin />
            </div>
          )}

          {hasResults && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F6F3F5' }}>
                  {['Strategy Name', 'Predicted Route', 'Composite Score'].map((h) => (
                    <th key={h} style={{ paddingBottom: 14, textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#504532', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STRATEGY_ORDER.map((strategy) => {
                  const row = comparisonQuery.data?.find((c) => c.strategy === strategy);
                  const meta = STRATEGY_META[strategy];
                  const scoreDetail = row ? getScoreForProvider(row.selectedProvider) : undefined;
                  const score = scoreDetail ? Math.round(scoreDetail.totalScore * 100) : null;
                  const isComposite = strategy === RoutingStrategy.COMPOSITE_SCORE;

                  return (
                    <tr key={strategy} style={{ borderBottom: '1px solid rgba(246,243,245,0.8)' }}>
                      <td style={{ padding: '18px 16px 18px 0' }}>
                        <div style={{ fontWeight: 500, fontSize: 13, color: '#1C1C1E' }}>{meta.name}</div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{meta.description}</div>
                      </td>
                      <td style={{ padding: '18px 16px 18px 0' }}>
                        {row ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                            background: isComposite ? 'rgba(252,185,0,0.15)' : '#F0EDEB',
                            color: isComposite ? '#7B5800' : '#1C1C1E',
                            border: isComposite ? '1px solid rgba(123,88,0,0.2)' : 'none',
                          }}>
                            {row.selectedProvider}
                          </span>
                        ) : <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '18px 0' }}>
                        {score !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#F0EDEB', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 999, width: `${score}%`,
                                background: 'linear-gradient(90deg, #FCB900, #7B5800)',
                              }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: isComposite ? '#7B5800' : '#1C1C1E', minWidth: 28 }}>
                              {score}
                            </span>
                          </div>
                        ) : <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: '#504532', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 8,
};
