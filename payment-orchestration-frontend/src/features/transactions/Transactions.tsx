import { useState } from 'react';
import { Table, Select, Button, Drawer, Tag, Spin, Tooltip } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useTransactions } from './hooks/useTransactions';
import { useTransactionDetail } from './hooks/useTransactionDetail';
import { PaymentStatus, Provider, Region } from '../../shared/types/enums';
import type { Transaction } from '../../shared/types/transaction';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  SUCCESS:         { bg: '#DCFCE7', color: '#166534' },
  FAILED:          { bg: '#FEE2E2', color: '#991B1B' },
  PROCESSING:      { bg: '#FEF3C7', color: '#92400E' },
  PENDING:         { bg: '#DBEAFE', color: '#1E40AF' },
  RETRY_EXHAUSTED: { bg: '#FEE2E2', color: '#7F1D1D' },
};

const PROVIDER_STYLE: Record<string, { bg: string; color: string }> = {
  BILLPLZ:  { bg: 'rgba(252,185,0,0.15)',  color: '#7B5800' },
  MIDTRANS: { bg: 'rgba(123,88,0,0.1)',    color: '#504532' },
  PAYMONGO: { bg: 'rgba(147,51,234,0.1)',  color: '#6B21A8' },
  MOCK:     { bg: '#F3F4F6',               color: '#6B7280' },
};

function StatusTag({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {status.replace('_', ' ')}
    </span>
  );
}

function ProviderTag({ provider }: { provider: string }) {
  const s = PROVIDER_STYLE[provider] ?? { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {provider}
    </span>
  );
}

function formatAmount(amount: number, currency: string) {
  const prefix: Record<string, string> = { MYR: 'RM', IDR: 'Rp', PHP: '₱' };
  return `${prefix[currency] ?? ''}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const EVENT_ICON: Record<string, string> = {
  INITIATED:   'play_circle',
  PROCESSING:  'autorenew',
  SUCCESS:     'check_circle',
  FAILED:      'cancel',
  RETRY:       'refresh',
  WEBHOOK:     'webhook',
  REFUND:      'undo',
};

export default function Transactions() {
  const [filters, setFilters] = useState<{
    status?: PaymentStatus;
    provider?: Provider;
    region?: Region;
    page: number;
    size: number;
  }>({ page: 0, size: 20 });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: page, isFetching } = useTransactions(filters);
  const { data: detail, isFetching: loadingDetail } = useTransactionDetail(selectedId);

  const columns: ColumnsType<Transaction> = [
    {
      title: 'Order ID',
      dataIndex: 'merchantOrderId',
      width: 160,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#1C1C1E', fontWeight: 500 }}>{v}</span>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      width: 130,
      render: (v: number, row) => (
        <span style={{ fontWeight: 700, fontSize: 13, color: '#1C1C1E' }}>
          {formatAmount(v, row.currency)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 140,
      render: (v: string) => <StatusTag status={v} />,
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      width: 120,
      render: (v: string) => <ProviderTag provider={v} />,
    },
    {
      title: 'Region',
      dataIndex: 'region',
      width: 80,
      render: (v: string) => (
        <Tag style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{v}</Tag>
      ),
    },
    {
      title: 'Routing',
      dataIndex: 'routingStrategy',
      width: 140,
      render: (v: string | null) => v
        ? <span style={{ fontSize: 12, color: '#6B7280' }}>{v.replace('_', ' ')}</span>
        : <span style={{ color: '#D1D5DB' }}>—</span>,
    },
    {
      title: 'Fee',
      dataIndex: 'fee',
      width: 90,
      render: (v: number | null, row) => v != null
        ? <span style={{ fontSize: 12, color: '#504532' }}>{formatAmount(v, row.currency)}</span>
        : <span style={{ color: '#D1D5DB' }}>—</span>,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 150,
      render: (v: string) => <span style={{ fontSize: 12, color: '#6B7280' }}>{formatDate(v)}</span>,
    },
    {
      title: '',
      key: 'action',
      width: 48,
      render: (_: unknown, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedId(row.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
        </button>
      ),
    },
  ];

  function handleTableChange(pagination: TablePaginationConfig) {
    setFilters((f) => ({
      ...f,
      page: (pagination.current ?? 1) - 1,
      size: pagination.pageSize ?? 20,
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>Transactions</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            {page ? `${page.totalElements.toLocaleString()} total` : 'Loading…'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: '16px 24px',
        boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Select
          allowClear
          placeholder="All statuses"
          style={{ width: 160 }}
          onChange={(v) => setFilters((f) => ({ ...f, status: v, page: 0 }))}
          options={Object.values(PaymentStatus).map((s) => ({ value: s, label: s.replace('_', ' ') }))}
        />
        <Select
          allowClear
          placeholder="All providers"
          style={{ width: 150 }}
          onChange={(v) => setFilters((f) => ({ ...f, provider: v, page: 0 }))}
          options={Object.values(Provider).map((p) => ({ value: p, label: p }))}
        />
        <Select
          allowClear
          placeholder="All regions"
          style={{ width: 130 }}
          onChange={(v) => setFilters((f) => ({ ...f, region: v, page: 0 }))}
          options={Object.values(Region).map((r) => ({ value: r, label: r }))}
        />
        <Button
          onClick={() => setFilters({ page: 0, size: 20 })}
          style={{ marginLeft: 'auto', color: '#6B7280', borderColor: '#E5E7EB' }}
        >
          Clear
        </Button>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)', overflow: 'hidden' }}>
        <Table<Transaction>
          columns={columns}
          dataSource={page?.content ?? []}
          rowKey="id"
          loading={isFetching}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id), style: { cursor: 'pointer' } })}
          pagination={{
            current: (filters.page ?? 0) + 1,
            pageSize: filters.size,
            total: page?.totalElements ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
          style={{ borderRadius: 16 }}
        />
      </div>

      {/* Detail drawer */}
      <Drawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        width={520}
        title={null}
        styles={{ body: { padding: 0 }, header: { display: 'none' } }}
      >
        {loadingDetail && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
            <Spin />
          </div>
        )}

        {detail && !loadingDetail && (() => {
          const tx = detail.transaction;
          return (
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 28 }}>
              {/* Drawer header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Transaction Detail
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1C1C1E' }}>
                    {formatAmount(tx.amount, tx.currency)}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <StatusTag status={tx.status} />
                    <ProviderTag provider={tx.provider} />
                    <Tag style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{tx.region}</Tag>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
                </button>
              </div>

              {/* Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                {[
                  { label: 'Order ID',     value: tx.merchantOrderId },
                  { label: 'Currency',     value: tx.currency },
                  { label: 'Routing',      value: tx.routingStrategy?.replace('_', ' ') ?? '—' },
                  { label: 'Fee',          value: tx.fee != null ? formatAmount(tx.fee, tx.currency) : '—' },
                  { label: 'Method',       value: tx.paymentMethod ?? '—' },
                  { label: 'Retry count',  value: tx.retryCount },
                  { label: 'Policy #',     value: tx.policyNumber ?? '—' },
                  { label: 'Claim ref',    value: tx.claimReference ?? '—' },
                  { label: 'Created',      value: formatDate(tx.createdAt), full: true },
                  { label: 'Customer',     value: tx.customerEmail ?? '—', full: true },
                  { label: 'Routing reason', value: tx.routingReason ?? '—', full: true },
                ].map(({ label, value, full }) => (
                  <div key={label} style={full ? { gridColumn: '1 / -1' } : {}}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                      {label}
                    </div>
                    <Tooltip title={String(value)} placement="topLeft">
                      <div style={{ fontSize: 13, color: '#1C1C1E', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String(value)}
                      </div>
                    </Tooltip>
                  </div>
                ))}
              </div>

              {/* Event timeline */}
              {detail.events.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#504532', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                    Event Timeline
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {detail.events.map((ev, i) => {
                      const isLast = i === detail.events.length - 1;
                      const icon = EVENT_ICON[ev.eventType] ?? 'circle';
                      return (
                        <div key={ev.id} style={{ display: 'flex', gap: 16 }}>
                          {/* line + dot */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'rgba(252,185,0,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#7B5800' }}>{icon}</span>
                            </div>
                            {!isLast && <div style={{ flex: 1, width: 2, background: '#F0EDEB', margin: '4px 0' }} />}
                          </div>
                          {/* content */}
                          <div style={{ paddingBottom: isLast ? 0 : 20, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>
                              {ev.eventType.replace(/_/g, ' ')}
                            </div>
                            {ev.description && (
                              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{ev.description}</div>
                            )}
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{formatDate(ev.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {detail.events.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '12px 0' }}>
                  No events recorded.
                </div>
              )}
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}
