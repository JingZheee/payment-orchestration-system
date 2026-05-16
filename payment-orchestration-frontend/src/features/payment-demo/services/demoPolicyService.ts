import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';

export interface DemoPolicy {
  id: string;
  holderName: string;
  holderEmail: string;
  insuranceType: string;
  policyNumber: string | null;
  claimReference: string | null;
  amount: number;
  currency: string;
  region: string;
  paymentMethod: string;
  paymentType: string;
  status: 'PENDING' | 'ACTIVATED' | 'DISBURSED';
  transactionId: string | null;
  createdAt: string;
}

export interface CreateDemoPolicyRequest {
  holderName: string;
  holderEmail: string;
  insuranceType: string;
  policyNumber?: string;
  claimReference?: string;
  amount: number;
  currency: string;
  region: string;
  paymentMethod: string;
  paymentType: string;
}

export const demoPolicyService = {
  getAll: async (): Promise<DemoPolicy[]> => {
    const { data } = await api.get<ApiResponse<DemoPolicy[]>>(API.DEMO_POLICIES.LIST);
    return data.data;
  },

  create: async (req: CreateDemoPolicyRequest): Promise<DemoPolicy> => {
    const { data } = await api.post<ApiResponse<DemoPolicy>>(API.DEMO_POLICIES.CREATE, req);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(API.DEMO_POLICIES.DELETE(id));
  },
};
