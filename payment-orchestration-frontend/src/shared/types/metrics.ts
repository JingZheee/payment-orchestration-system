import type { Provider, Region } from './enums';

export interface ProviderMetrics {
  id: number;
  provider: Provider;
  region: Region;
  successRate: number;
  avgLatencyMs: number;
  transactionCount: number;
  feeAccuracyRate: number;
  windowStart: string;
  windowEnd: string;
}
