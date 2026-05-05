import type { Provider, Region } from './enums';

export interface ReconStatement {
  id: number;
  transactionId: string;
  provider: Provider;
  region: Region;
  paymentMethod: string;
  transactionAmount: number;
  expectedFee: number | null;
  actualFee: number | null;
  variance: number | null;
  variancePct: number | null;
  anomaly: boolean;
  statementDate: string | null;
  createdAt: string;
}
