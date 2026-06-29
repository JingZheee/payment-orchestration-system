import { useState } from 'react';
import { Table, Button, Tag, Popconfirm, message } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import { useDlqTransactions } from './hooks/useDlqTransactions';
import { useRequeue } from './hooks/useRequeue';
import { PaymentType } from '../../shared/types/enums';
import type { Transaction } from '../../shared/types/transaction';
import PageHeader from '../../shared/components/PageHeader';
import TableCard from '../../shared/components/TableCard';
import ProviderBadge from '../../shared/components/ProviderBadge';
import InfoBanner from '../../shared/components/InfoBanner';
import EmptyState from '../../shared/components/EmptyState';
import TransactionDetailDrawer from '../transactions/components/TransactionDetailDrawer';
import { formatAmount, formatDate } from '../../shared/utils/format';
import { isAdmin } from '../../lib/role';
import styles from './DeadLetterQueue.module.css';

export default function DeadLetterQueue() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requeueingId, setRequeuingId] = useState<string | null>(null);

  const { data: dlqPage, isFetching } = useDlqTransactions(page, size);
  const requeue = useRequeue();
  const [messageApi, contextHolder] = message.useMessage();

  function handleRequeue(tx: Transaction) {
    setRequeuingId(tx.id);
    requeue.mutate(tx.id, {
      onSuccess: () => {
        messageApi.success(`${tx.merchantOrderId} re-queued — retry attempt 1 scheduled`);
        setRequeuingId(null);
      },
      onError: () => {
        messageApi.error('Re-queue failed — check provider status before retrying');
        setRequeuingId(null);
      },
    });
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
      width: 120,
      render: (v: number, row) => (
        <span className={styles.cellAmount}>{formatAmount(v, row.currency)}</span>
      ),
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      width: 110,
      render: (v) => <ProviderBadge provider={v} />,
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
      width: 120,
      render: (v: PaymentType | null) => {
        if (!v) return <span className={styles.cellMuted}>—</span>;
        const isPremium = v === PaymentType.PREMIUM_COLLECTION;
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
      title: 'Retries',
      dataIndex: 'retryCount',
      width: 80,
      align: 'center' as const,
      render: (v: number) => (
        <span className={styles.retryBadge}>{v ?? 3}</span>
      ),
    },
    {
      title: 'Exhausted at',
      dataIndex: 'updatedAt',
      width: 155,
      render: (v: string) => <span className={styles.cellDate}>{formatDate(v)}</span>,
    },
    {
      title: '',
      key: 'actions',
      width: 150,
      render: (_: unknown, row) => (
        <div className={styles.actionCell} onClick={(e) => e.stopPropagation()}>
          {isAdmin() && (
            <Popconfirm
              title="Re-queue this transaction?"
              description="Resets status to PROCESSING and schedules a fresh retry. Only do this after the provider issue is resolved."
              okText="Re-queue"
              cancelText="Cancel"
              okButtonProps={{
                style: { background: '#FCB900', borderColor: '#FCB900', color: '#1C1C1E', fontWeight: 600 },
              }}
              onConfirm={() => handleRequeue(row)}
            >
              <Button
                size="small"
                icon={<ReloadOutlined />}
                loading={requeueingId === row.id}
                disabled={!!requeueingId && requeueingId !== row.id}
                className={styles.requeueBtn}
              >
                Re-queue
              </Button>
            </Popconfirm>
          )}
          <button
            className={styles.chevronBtn}
            onClick={() => setSelectedId(row.id)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
          </button>
        </div>
      ),
    },
  ];

  function handleTableChange(pagination: TablePaginationConfig) {
    setPage((pagination.current ?? 1) - 1);
    setSize(pagination.pageSize ?? 20);
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      <PageHeader
        title="Stalled Transactions"
        subtitle={
          dlqPage
            ? dlqPage.totalElements === 0
              ? 'All clear — no stalled transactions'
              : `${dlqPage.totalElements.toLocaleString()} exhausted`
            : 'Loading…'
        }
      />

      <InfoBanner icon="warning" variant="amber">
        These transactions exhausted all 3 automated retry attempts (30 s → 60 s → 120 s).
        The provider could not confirm a final status. Re-queue only after confirming the provider
        issue is resolved — clicking Re-queue resets the status to PROCESSING and schedules a
        fresh attempt.
      </InfoBanner>

      <TableCard>
        <Table<Transaction>
          columns={columns}
          dataSource={dlqPage?.content ?? []}
          rowKey="id"
          loading={isFetching}
          onRow={(row) => ({
            onClick: () => setSelectedId(row.id),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page + 1,
            pageSize: size,
            total: dlqPage?.totalElements ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <EmptyState
                icon="check_circle"
                message="No stalled transactions — all payments resolved."
              />
            ),
          }}
        />
      </TableCard>

      <TransactionDetailDrawer
        transactionId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
