import type { Provider, Region } from './enums';

export interface ReconSummary {
  totalStatements: number;
  totalAnomalies: number;
  totalVariance: number;
}

export interface ReconImportResult {
  rowsProcessed: number;
  rowsMatched: number;
  rowsUnmatched: number;
  rowsSkipped: number;
  rowsNoFee: number;
  anomaliesFound: number;
}

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
