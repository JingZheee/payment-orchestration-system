import { Tag } from 'antd';
import type { PaymentStatus } from '../types';

const STATUS_CONFIG: Record<PaymentStatus, { color: string; bg: string; label: string }> = {
  SUCCESS:          { color: '#166534', bg: '#86EFAC', label: 'Settled'    },
  FAILED:           { color: '#991B1B', bg: '#FCA5A5', label: 'Failed'     },
  PENDING:          { color: '#075985', bg: '#BAE6FD', label: 'Pending'    },
  PROCESSING:       { color: '#92400E', bg: '#FED7AA', label: 'Processing' },
  RETRY_EXHAUSTED:  { color: '#991B1B', bg: '#FCA5A5', label: 'Exhausted' },
};

interface StatusBadgeProps {
  status: PaymentStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? { color: '#374151', bg: '#F3F4F6', label: status };
  return (
    <Tag
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: 'none',
        borderRadius: 999,
        fontWeight: 600,
        fontSize: 12,
        padding: '2px 10px',
      }}
    >
      {cfg.label}
    </Tag>
  );
}
