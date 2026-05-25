import type { Provider, Region, FeeType } from './enums';

export interface FeeRate {
  id: number;
  provider: Provider;
  region: Region;
  paymentMethod: string;
  feeType: FeeType;
  fixedAmount: number | null;
  percentage: number | null;
  currency: string;
  active: boolean;
  updatedAt: string;
}

export interface FeeRateCreateRequest {
  provider: string;
  region: string;
  paymentMethod: string;
  feeType: string;
  fixedAmount?: number;
  percentage?: number;
  active?: boolean;
}

export interface FeeRateUpdateRequest {
  fixedAmount?: number;
  percentage?: number;
  active?: boolean;
}
