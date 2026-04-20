import type { Provider, RoutingStrategy } from './enums';

export interface TransactionSummary {
  total: number;
  byStatus: Record<string, number>;
  byProvider: Record<string, number>;
  byRegion: Record<string, number>;
  totalVolume?: number;
  totalFees?: number;
}

export interface ScoreDetail {
  provider: Provider;
  totalScore: number;
  successRateScore: number;
  feeScore: number;
  latencyScore: number;
  feeAccuracyScore: number;
}

export interface StrategyComparison {
  strategy: RoutingStrategy;
  selectedProvider: Provider | 'NONE';
  reason: string;
}
