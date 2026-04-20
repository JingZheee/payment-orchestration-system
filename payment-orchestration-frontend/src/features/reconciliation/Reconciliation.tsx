import { useState } from 'react';
import { Table, Select, Tag } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useRecon } from './hooks/useRecon';
import type { ReconStatement } from '../../shared/types/recon';
import { Provider } from '../../shared/types/enums';

const PROVIDER_STYLE: Record<string, { color: string; bg: string }> = {
  BILLPLZ:  { color: '#7B5800', bg: 'rgba(252,185,0,0.12)' },
  MIDTRANS: { color: '#065F46', bg: 'rgba(6,95,70,0.08)' },
  PAYMONGO: { color: '#6B21A8', bg: 'rgba(107,33,168,0.08)' },
  MOCK:     { color: '#374151', bg: 'rgba(55,65,81,0.06)' },
};

function fmt(v: number | null, prefix = '') {
  if (v == null) return '—';
  return `${prefix}${Number(v).toFixed(4)}`;
}

function VarianceCell({ variance, variancePct }: { variance: number | null; variancePct: number | null }) {
  if (variance == null) return <span style={{ color: '#D1D5DB' }}>—</span>;
  const abs = Math.abs(Number(variance));
  const pct = variancePct != null ? Math.abs(Number(variancePct) * 100) : null;
  const isZero = abs < 0.0001;
  const color = isZero ? '#166534' : abs < 0.5 ? '#92400E' : '#991B1B';
  const bg    = isZero ? '#DCFCE7' : abs < 0.5 ? '#FEF3C7' : '#FEE2E2';
  return (
    <div style={{ display: 'flex', flex: 'column', gap: 2 }}>
      <span style={{
        display: 'inline-block', padding: '2px 8px', borderRadius: 6,
        fontSize: 12, fontWeight: 700, background: bg, color,
      }}>
        {isZero ? '±0' : `${Number(variance) > 0 ? '+' : ''}${Number(variance).toFixed(4)}`}
      </span>
      {pct != null && !isZero && (
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
          {pct.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export default function Reconciliation() {
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [provider, setProvider] = useState<Provider | undefined>();
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isFetching } = useRecon({ anomaliesOnly, provider, page, size: pageSize });

  // Summary stats from current page (lightweight — no separate endpoint)
  const rows = data?.content ?? [];
  const anomalyCount  = rows.filter(r => r.anomaly).length;
  const totalVariance = rows.reduce((s, r) => s + Math.abs(Number(r.variance ?? 0)), 0);

  const columns: ColumnsType<ReconStatement> = [
    {
      title: 'Transaction ID',
      dataIndex: 'transactionId',
      width: 200,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }}>
          {v ? `${v.slice(0, 8)}…` : '—'}
        </span>
      ),
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      width: 120,
      render: (v: string) => {
        const s = PROVIDER_STYLE[v] ?? { color: '#6B7280', bg: '#F3F4F6' };
        return (
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 999,
            fontSize: 12, fontWeight: 700, background: s.bg, color: s.color,
          }}>
            {v}
          </span>
        );
      },
    },
    {
      title: 'Region',
      dataIndex: 'region',
      width: 80,
      render: (v: string) => v
        ? <Tag style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#D1D5DB' }}>—</span>,
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      width: 130,
      render: (v: string) => v
        ? <span style={{ fontSize: 12, color: '#504532' }}>{v.replace(/_/g, ' ')}</span>
        : <span style={{ color: '#D1D5DB' }}>—</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'transactionAmount',
      width: 110,
      render: (v: number) => (
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>
          {Number(v).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Expected Fee',
      dataIndex: 'expectedFee',
      width: 120,
      render: (v: number | null) => (
        <span style={{ fontSize: 13, color: '#504532' }}>{fmt(v)}</span>
      ),
    },
    {
      title: 'Actual Fee',
      dataIndex: 'actualFee',
      width: 110,
      render: (v: number | null) => (
        <span style={{ fontSize: 13, color: '#504532' }}>{fmt(v)}</span>
      ),
    },
    {
      title: 'Variance',
      width: 120,
      render: (_: unknown, row: ReconStatement) => (
        <VarianceCell variance={row.variance} variancePct={row.variancePct} />
      ),
    },
    {
      title: 'Anomaly',
      dataIndex: 'anomaly',
      width: 90,
      render: (v: boolean) => v ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
          background: '#FEE2E2', color: '#991B1B',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warning</span>
          Yes
        </span>
      ) : (
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 999,
          fontSize: 12, fontWeight: 600, background: '#DCFCE7', color: '#166534',
        }}>
          Clean
        </span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'statementDate',
      width: 110,
      render: (v: string | null) => v
        ? <span style={{ fontSize: 12, color: '#6B7280' }}>{v}</span>
        : <span style={{ color: '#D1D5DB' }}>—</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>Reconciliation</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
          Reconcile expected platform fees against actual provider settlements.
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          {
            label: 'Total Statements',
            value: data?.totalElements.toLocaleString() ?? '—',
            icon: 'receipt_long',
            iconBg: 'rgba(252,185,0,0.1)',
            iconColor: '#7B5800',
          },
          {
            label: 'Anomalies (this page)',
            value: anomalyCount,
            icon: 'warning',
            iconBg: 'rgba(239,68,68,0.1)',
            iconColor: '#991B1B',
          },
          {
            label: 'Total Variance (this page)',
            value: totalVariance.toFixed(4),
            icon: 'balance',
            iconBg: totalVariance > 1 ? 'rgba(239,68,68,0.1)' : 'rgba(134,239,172,0.15)',
            iconColor: totalVariance > 1 ? '#991B1B' : '#166534',
          },
        ].map(({ label, value, icon, iconBg, iconColor }) => (
          <div key={label} style={{
            background: '#FFFFFF', borderRadius: 16, padding: 20,
            boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              padding: 10, borderRadius: 10, background: iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: iconColor }}>{icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1C1C1E', lineHeight: 1.2, marginTop: 4 }}>
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + tabs */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: '16px 24px',
        boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)',
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* Tab buttons */}
        <div style={{ display: 'flex', background: '#F6F3F5', borderRadius: 10, padding: 4, gap: 2 }}>
          {[
            { label: 'All Statements', value: false },
            { label: 'Anomalies Only', value: true },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => { setAnomaliesOnly(value); setPage(0); }}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: anomaliesOnly === value ? '#FFFFFF' : 'transparent',
                color: anomaliesOnly === value ? (value ? '#991B1B' : '#1C1C1E') : '#6B7280',
                boxShadow: anomaliesOnly === value ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {value && (
                <span className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 4 }}>
                  warning
                </span>
              )}
              {label}
            </button>
          ))}
        </div>

        <Select
          allowClear
          placeholder="All providers"
          style={{ width: 160 }}
          onChange={(v) => { setProvider(v); setPage(0); }}
          options={Object.values(Provider).map(p => ({ value: p, label: p }))}
        />

        {anomaliesOnly && (
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: '#991B1B', background: '#FEE2E2',
            padding: '6px 14px', borderRadius: 8,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
            Showing fee discrepancies only
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)', overflow: 'hidden' }}>
        <Table<ReconStatement>
          columns={columns}
          dataSource={rows}
          rowKey="id"
          loading={isFetching}
          rowClassName={(r) => r.anomaly ? 'recon-anomaly-row' : ''}
          style={{ ['--anomaly-bg' as string]: 'rgba(254,226,226,0.4)' }}
          pagination={{
            current: page + 1,
            pageSize,
            total: data?.totalElements ?? 0,
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
            showSizeChanger: false,
          }}
          onChange={(p: TablePaginationConfig) => setPage((p.current ?? 1) - 1)}
          scroll={{ x: 1100 }}
        />
      </div>

      <style>{`.recon-anomaly-row td { background: rgba(254,226,226,0.25) !important; }`}</style>
    </div>
  );
}
