import type { Provider, Region, Currency, RoutingStrategy } from './enums';

export interface RoutingRule {
  id: number;
  priority: number;
  region: Region | null;
  currency: Currency | null;
  minAmount: number | null;
  maxAmount: number | null;
  preferredProvider: Provider | null;
  strategy: RoutingStrategy | null;
  enabled: boolean;
  createdAt: string;
}

export interface RoutingRuleRequest {
  priority: number;
  region: Region | null;
  currency: Currency | null;
  minAmount: number | null;
  maxAmount: number | null;
  preferredProvider: Provider | null;
  strategy: RoutingStrategy | null;
  enabled: boolean;
}

export interface SimulateRequest {
  region: Region;
  amount: number;
  currency: Currency;
  paymentMethod?: string;
}

export interface SimulateResult {
  selectedProvider: Provider | 'NONE';
  matchedRule: RoutingRule | null;
  strategy: RoutingStrategy;
  reason: string;
  scoreBreakdown: Record<string, { total: number; successRateScore: number; feeScore: number; latencyScore: number }>;
  fallbackProvider: Provider | null;
}
