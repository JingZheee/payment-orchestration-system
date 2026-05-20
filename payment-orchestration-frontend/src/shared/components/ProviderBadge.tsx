import { Tag } from 'antd';
import type { Provider } from '../types';
import { PROVIDER_BADGE_CONFIG } from '../constants/providerStyles';

interface ProviderBadgeProps {
  provider: Provider;
}

export default function ProviderBadge({ provider }: ProviderBadgeProps) {
  const cfg = PROVIDER_BADGE_CONFIG[provider] ?? { color: '#374151', bg: 'rgba(55,65,81,0.06)' };
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
