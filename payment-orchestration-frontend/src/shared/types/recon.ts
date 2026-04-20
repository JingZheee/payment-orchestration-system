import type { Provider, Region, PaymentMethod } from './enums';

export interface ReconStatement {
  id: number;
  transactionId: string;
  provider: Provider;
  region: Region;
  paymentMethod: PaymentMethod;
  transactionAmount: number;
  expectedFee: number | null;
  actualFee: number | null;
  variance: number | null;
  variancePct: number | null;
  anomaly: boolean;
  statementDate: string | null;
  createdAt: string;
}
