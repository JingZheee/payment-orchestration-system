import type { Provider } from './enums';

export interface ProviderConfig {
  provider: Provider;
  enabled: boolean;
  feePercentage: number;
  webhookSecret: string | null;
  updatedAt: string;
}
