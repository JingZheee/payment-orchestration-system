import { Drawer, Spin, Tag, Tooltip } from 'antd';
import { useTransactionDetail } from '../hooks/useTransactionDetail';
import StatusBadge from '../../../shared/components/StatusBadge';
import ProviderBadge from '../../../shared/components/ProviderBadge';
import { formatAmount, formatDate } from '../utils';
import { PaymentType } from '../../../shared/types/enums';
import styles from './TransactionDetailDrawer.module.css';

const EVENT_ICON: Record<string, string> = {
  INITIATED:   'play_circle',
  PROCESSING:  'autorenew',
  SUCCESS:     'check_circle',
  FAILED:      'cancel',
  RETRY:       'refresh',
  WEBHOOK:     'webhook',
  REFUND:      'undo',
};

interface Props {
  transactionId: string | null;
  onClose: () => void;
}

export default function TransactionDetailDrawer({ transactionId, onClose }: Props) {
  const { data: detail, isFetching } = useTransactionDetail(transactionId);

  return (
    <Drawer
      open={!!transactionId}
      onClose={onClose}
      width={520}
      title={null}
      styles={{ body: { padding: 0 }, header: { display: 'none' } }}
    >
      {isFetching && (
        <div className={styles.loadingWrap}>
          <Spin />
        </div>
      )}

      {detail && !isFetching && (() => {
        const tx = detail.transaction;

        const fields: { label: string; value: string; full?: boolean }[] = [
          { label: 'Order ID',       value: tx.merchantOrderId },
          { label: 'Currency',       value: tx.currency },
          { label: 'Routing',        value: tx.routingStrategy?.replace(/_/g, ' ') ?? '—' },
          { label: 'Fee',            value: tx.fee != null ? formatAmount(tx.fee, tx.currency) : '—' },
          { label: 'Method',         value: tx.paymentMethod ?? '—' },
          { label: 'Retry count',    value: String(tx.retryCount) },
          { label: 'Payment Type',   value: tx.paymentType === PaymentType.PREMIUM_COLLECTION ? 'Premium Collection' : tx.paymentType === PaymentType.CLAIMS_DISBURSEMENT ? 'Claims Disbursement' : '—' },
          { label: 'Policy #',       value: tx.policyNumber ?? '—' },
          { label: 'Claim ref',      value: tx.claimReference ?? '—' },
          { label: 'Created',        value: formatDate(tx.createdAt), full: true },
          { label: 'Customer',       value: tx.customerEmail ?? '—', full: true },
          { label: 'Routing reason', value: tx.routingReason ?? '—', full: true },
        ];

        return (
          <div className={styles.body}>
            {/* Header */}
            <div className={styles.header}>
              <div>
                <div className={styles.headerMeta}>Transaction Detail</div>
                <div className={styles.headerAmount}>{formatAmount(tx.amount, tx.currency)}</div>
                <div className={styles.headerBadges}>
                  <StatusBadge status={tx.status} />
                  <ProviderBadge provider={tx.provider} />
                  <Tag style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{tx.region}</Tag>
                </div>
              </div>
              <button className={styles.closeBtn} onClick={onClose}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>

            {/* Fields */}
            <div className={styles.fields}>
              {fields.map(({ label, value, full }) => (
                <div key={label} className={full ? styles.fieldFull : undefined}>
                  <div className={styles.fieldLabel}>{label}</div>
                  <Tooltip title={value} placement="topLeft">
                    <div className={styles.fieldValue}>{value}</div>
                  </Tooltip>
                </div>
              ))}
            </div>

            {/* Timeline */}
            {detail.events.length > 0 && (
              <div>
                <div className={styles.timelineHeader}>Event Timeline</div>
                <div className={styles.timelineList}>
                  {detail.events.map((ev, i) => {
                    const isLast = i === detail.events.length - 1;
                    return (
                      <div key={ev.id} className={styles.timelineItem}>
                        <div className={styles.timelineTrack}>
                          <div className={styles.timelineDot}>
                            <span className={`material-symbols-outlined ${styles.timelineDotIcon}`}>
                              {EVENT_ICON[ev.eventType] ?? 'circle'}
                            </span>
                          </div>
                          {!isLast && <div className={styles.timelineLine} />}
                        </div>
                        <div className={isLast ? styles.timelineContentLast : styles.timelineContent}>
                          <div className={styles.timelineType}>{ev.eventType.replace(/_/g, ' ')}</div>
                          {ev.description && (
                            <div className={styles.timelineDesc}>{ev.description}</div>
                          )}
                          <div className={styles.timelineTime}>{formatDate(ev.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detail.events.length === 0 && (
              <div className={styles.timelineEmpty}>No events recorded.</div>
            )}
          </div>
        );
      })()}
    </Drawer>
  );
}
