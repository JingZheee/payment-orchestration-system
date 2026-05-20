import { useState } from 'react';
import { Table, Select, Button, Tag, Popover, Input } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult, FilterValue } from 'antd/es/table/interface';
import { FilterOutlined } from '@ant-design/icons';
import { useTransactions } from './hooks/useTransactions';
import { PaymentStatus, Provider, Region, PaymentType } from '../../shared/types/enums';
import type { Transaction } from '../../shared/types/transaction';
import PageHeader from '../../shared/components/PageHeader';
import TableCard from '../../shared/components/TableCard';
import StatusBadge from '../../shared/components/StatusBadge';
import ProviderBadge from '../../shared/components/ProviderBadge';
import TransactionDetailDrawer from './components/TransactionDetailDrawer';
import { formatAmount, formatDate } from './utils';
import styles from './Transactions.module.css';

type FilterKey = 'status' | 'provider' | 'region';

interface ActiveChip {
  key: FilterKey;
  label: string;
  value: string;
}

export default function Transactions() {
  const [filters, setFilters] = useState<{
    status?: PaymentStatus;
    provider?: Provider;
    region?: Region;
    search?: string;
    sort?: string;
    page: number;
    size: number;
  }>({ page: 0, size: 20 });

  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: page, isFetching } = useTransactions(filters);

  const activeChips: ActiveChip[] = [
    filters.status   && { key: 'status'   as const, label: 'Status',   value: filters.status.replace(/_/g, ' ') },
    filters.provider && { key: 'provider' as const, label: 'Provider', value: filters.provider },
    filters.region   && { key: 'region'   as const, label: 'Region',   value: filters.region },
  ].filter(Boolean) as ActiveChip[];

  function clearDropdownFilters() {
    setFilters((f) => ({ page: 0, size: f.size, search: f.search, sort: f.sort }));
  }

  const columns: ColumnsType<Transaction> = [
    {
      title: 'Order ID',
      dataIndex: 'merchantOrderId',
      width: 160,
      render: (v: string) => <span className={styles.cellMonospace}>{v}</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      width: 130,
      sorter: true,
      sortDirections: ['ascend', 'descend'] as const,
      render: (v: number, row) => (
        <span className={styles.cellAmount}>{formatAmount(v, row.currency)}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 140,
      render: (v: PaymentStatus) => <StatusBadge status={v} />,
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      width: 120,
      render: (v: Provider) => <ProviderBadge provider={v} />,
    },
    {
      title: 'Region',
      dataIndex: 'region',
      width: 80,
      render: (v: string) => <Tag className={styles.regionTag}>{v}</Tag>,
    },
    {
      title: 'Type',
      dataIndex: 'paymentType',
      width: 160,
      render: (v: PaymentType | null) => {
        if (!v) return <span className={styles.cellMuted}>—</span>;
        const isPremium = v === PaymentType.PREMIUM_COLLECTION;
        // inline justified: color is data-driven (isPremium determines amber vs purple)
        return (
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 999,
            fontSize: 11, fontWeight: 600,
            background: isPremium ? 'rgba(252,185,0,0.15)' : 'rgba(147,51,234,0.1)',
            color: isPremium ? '#7B5800' : '#6B21A8',
          }}>
            {isPremium ? 'Premium' : 'Claim'}
          </span>
        );
      },
    },
    {
      title: 'Routing',
      dataIndex: 'routingStrategy',
      width: 140,
      render: (v: string | null) => v
        ? <span className={styles.cellRouting}>{v.replace(/_/g, ' ')}</span>
        : <span className={styles.cellMuted}>—</span>,
    },
    {
      title: 'Fee',
      dataIndex: 'fee',
      width: 90,
      sorter: true,
      sortDirections: ['ascend', 'descend'] as const,
      render: (v: number | null, row) => v != null
        ? <span className={styles.cellFee}>{formatAmount(v, row.currency)}</span>
        : <span className={styles.cellMuted}>—</span>,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 150,
      sorter: true,
      sortDirections: ['ascend', 'descend'] as const,
      defaultSortOrder: 'descend' as const,
      render: (v: string) => <span className={styles.cellDate}>{formatDate(v)}</span>,
    },
    {
      title: '',
      key: 'action',
      width: 48,
      render: (_: unknown, row) => (
        <button
          className={styles.chevronBtn}
          onClick={(e) => { e.stopPropagation(); setSelectedId(row.id); }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
        </button>
      ),
    },
  ];

  function handleTableChange(
    pagination: TablePaginationConfig,
    _tableFilters: Record<string, FilterValue | null>,
    sorter: SorterResult<Transaction> | SorterResult<Transaction>[],
  ) {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortField = s?.order ? String(s.field) : 'createdAt';
    const sortDir = s?.order === 'ascend' ? 'asc' : 'desc';
    setFilters((f) => ({
      ...f,
      page: (pagination.current ?? 1) - 1,
      size: pagination.pageSize ?? 20,
      sort: `${sortField},${sortDir}`,
    }));
  }

  const filterPopoverContent = (
    <div className={styles.popoverContent}>
      <div>
        <div className={styles.popoverLabel}>Status</div>
        <Select
          allowClear
          placeholder="Any status"
          style={{ width: '100%' }}
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v, page: 0 }))}
          options={Object.values(PaymentStatus).map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
        />
      </div>
      <div>
        <div className={styles.popoverLabel}>Provider</div>
        <Select
          allowClear
          placeholder="Any provider"
          style={{ width: '100%' }}
          value={filters.provider}
          onChange={(v) => setFilters((f) => ({ ...f, provider: v, page: 0 }))}
          options={Object.values(Provider).map((p) => ({ value: p, label: p }))}
        />
      </div>
      <div>
        <div className={styles.popoverLabel}>Region</div>
        <Select
          allowClear
          placeholder="Any region"
          style={{ width: '100%' }}
          value={filters.region}
          onChange={(v) => setFilters((f) => ({ ...f, region: v, page: 0 }))}
          options={Object.values(Region).map((r) => ({ value: r, label: r }))}
        />
      </div>
      {activeChips.length > 0 && (
        <Button
          size="small"
          type="text"
          onClick={() => { clearDropdownFilters(); setFilterOpen(false); }}
          style={{ color: 'var(--text-tertiary)', textAlign: 'left', padding: '0 2px' }}
        >
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Transactions"
        subtitle={page ? `${page.totalElements.toLocaleString()} total` : 'Loading…'}
      />

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterTopRow}>
          <Input.Search
            placeholder="Search order ID…"
            allowClear
            className={styles.filterSearch}
            onSearch={(v) => setFilters((f) => ({ ...f, search: v || undefined, page: 0 }))}
            onChange={(e) => { if (!e.target.value) setFilters((f) => ({ ...f, search: undefined, page: 0 })); }}
          />
          <Popover
            open={filterOpen}
            onOpenChange={setFilterOpen}
            trigger="click"
            content={filterPopoverContent}
            placement="bottomLeft"
            arrow={false}
          >
            {/* inline justified: border/bg change based on activeChips.length (runtime data) */}
            <Button
              icon={<FilterOutlined />}
              style={{
                borderColor: activeChips.length > 0 ? '#FCB900' : undefined,
                color: activeChips.length > 0 ? '#7B5800' : undefined,
                background: activeChips.length > 0 ? 'var(--color-accent-subtle)' : undefined,
                fontWeight: activeChips.length > 0 ? 600 : undefined,
              }}
            >
              Filters{activeChips.length > 0 ? ` · ${activeChips.length}` : ''}
            </Button>
          </Popover>
        </div>

        {activeChips.length > 0 && (
          <div className={styles.activeChips}>
            {activeChips.map((chip) => (
              <Tag
                key={chip.key}
                closable
                className={styles.chip}
                onClose={() => setFilters((f) => ({ ...f, [chip.key]: undefined, page: 0 }))}
              >
                {chip.label}: {chip.value}
              </Tag>
            ))}
            <button className={styles.clearAllBtn} onClick={clearDropdownFilters}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <TableCard>
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
        />
      </TableCard>

      <TransactionDetailDrawer
        transactionId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
