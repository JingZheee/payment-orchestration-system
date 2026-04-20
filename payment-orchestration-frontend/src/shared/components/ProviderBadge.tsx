import { Tag } from 'antd';
import type { Provider } from '../types';

const PROVIDER_CONFIG: Record<Provider, { color: string; bg: string }> = {
  BILLPLZ:  { color: '#1e40af', bg: '#DBEAFE' },
  MIDTRANS: { color: '#065f46', bg: '#D1FAE5' },
  PAYMONGO: { color: '#6b21a8', bg: '#F3E8FF' },
  MOCK:     { color: '#374151', bg: '#F3F4F6' },
};

interface ProviderBadgeProps {
  provider: Provider;
}

export default function ProviderBadge({ provider }: ProviderBadgeProps) {
  const cfg = PROVIDER_CONFIG[provider] ?? { color: '#374151', bg: '#F3F4F6' };
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
      {provider}
    </Tag>
  );
}
