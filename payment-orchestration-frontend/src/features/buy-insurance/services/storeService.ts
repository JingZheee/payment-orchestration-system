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

export interface StoreQuoteRequest {
  holderName: string;
  holderEmail: string;
  insuranceType: string;
  amount: number;
  region: string;
  currency: string;
  appBaseUrl: string;
}

export interface StoreQuoteResponse {
  policyId: string;
  quoteReference: string;
  message: string;
}

export interface StorePayRequest {
  policyId: string;
  redirectUrl: string;
  paymentMethod: string;
  bankCode?: string;
}

export interface CheckoutResponse {
  policyId: string;
  transactionId: string;
  redirectUrl: string | null;
  vaNumber: string | null;
}

export interface StoreResult {
  transactionId: string | null;
  status: string;
  provider: string | null;
  routingStrategy: string | null;
  routingReason: string | null;
  fee: number | null;
  amount: number;
  currency: string;
  policyNumber: string | null;
  holderName: string | null;
  holderEmail: string | null;
  insuranceType: string | null;
  paymentMethod: string | null;
  region: string | null;
  createdAt: string;
}

export const storeService = {
  getProducts: async (region: string): Promise<StoreProduct[]> => {
    const { data } = await api.get<ApiResponse<StoreProduct[]>>(API.STORE.PRODUCTS, {
      params: { region },
    });
    return data.data;
  },

  createQuote: async (req: StoreQuoteRequest): Promise<StoreQuoteResponse> => {
    const { data } = await api.post<ApiResponse<StoreQuoteResponse>>(API.STORE.QUOTE, req);
    return data.data;
  },

  initiateStorePayment: async (req: StorePayRequest): Promise<CheckoutResponse> => {
    const { data } = await api.post<ApiResponse<CheckoutResponse>>(API.STORE.PAY, req);
    return data.data;
  },

  getResult: async (policyId: string): Promise<StoreResult> => {
    const { data } = await api.get<ApiResponse<StoreResult>>(API.STORE.RESULT(policyId));
    return data.data;
  },
};
