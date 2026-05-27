import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';

export interface StoreProduct {
  id: string;
  code: string;
  name: string;
  insuranceType: string;
  tagline: string;
  amount: number;
  billingPeriod: string;
  features: string[];
  badge: string | null;
  region: string;
  currency: string;
}

export interface CheckoutRequest {
  holderName: string;
  holderEmail: string;
  insuranceType: string;
  amount: number;
  paymentMethod: string;
  redirectUrl: string;
  region: string;
  currency: string;
}

export interface CheckoutResponse {
  policyId: string;
  transactionId: string;
  redirectUrl: string;
}

export interface StoreResult {
  transactionId: string;
  status: string;
  provider: string;
  routingStrategy: string | null;
  routingReason: string | null;
  fee: number | null;
  amount: number;
  currency: string;
  policyNumber: string | null;
  holderName: string | null;
  holderEmail: string | null;
  insuranceType: string | null;
  createdAt: string;
}

export const storeService = {
  getProducts: async (region: string): Promise<StoreProduct[]> => {
    const { data } = await api.get<ApiResponse<StoreProduct[]>>(API.STORE.PRODUCTS, {
      params: { region },
    });
    return data.data;
  },

  checkout: async (req: CheckoutRequest): Promise<CheckoutResponse> => {
    const { data } = await api.post<ApiResponse<CheckoutResponse>>(
      API.STORE.CHECKOUT,
      req,
    );
    return data.data;
  },

  getResult: async (billId: string): Promise<StoreResult> => {
    const { data } = await api.get<ApiResponse<StoreResult>>(
      API.STORE.RESULT(billId),
    );
    return data.data;
  },
};
