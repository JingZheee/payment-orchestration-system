import type { Provider } from './enums';

export interface ProviderConfig {
  provider: Provider;
  enabled: boolean;
  feePercentage: number;
  webhookSecret: string | null;
  updatedAt: string;
}

export interface ProviderSummary {
  provider: Provider;
  label: string;
  regions: string[];
  webhookType: string;
  enabled: boolean;
  updatedAt: string;
  successRate: number | null;
  avgLatencyMs: number | null;
  transactionCount: number | null;
  supportedMethods: string[];
}
