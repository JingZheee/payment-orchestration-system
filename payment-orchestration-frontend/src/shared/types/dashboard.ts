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
  // Raw inputs
  successRate: number;
  rawFee: number;
  latencyMs: number;
  feeAccuracy: number;
  // Weighted components (srComponent + feeComponent + latencyComponent + accuracyComponent = totalScore)
  srComponent: number;
  feeComponent: number;
  latencyComponent: number;
  accuracyComponent: number;
}

export interface StrategyComparison {
  strategy: RoutingStrategy;
  selectedProvider: Provider | 'NONE';
  reason: string;
}

export interface SimulateDecision {
  provider: Provider;
  strategy: RoutingStrategy;
  reason: string;
  score: number | null;
}
