import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';

export interface PolicyStatusEvent {
  eventType: string;
  description: string;
  createdAt: string;
}

export interface PolicyStatus {
  policyId: string;
  policyNumber: string | null;
  holderName: string;
  holderEmail: string;
  insuranceType: string;
  amount: number;
  currency: string;
  region: string;
  paymentMethod: string | null;
  paymentType: string;
  status: string;
  transactionId: string | null;
  provider: string | null;
  routingStrategy: string | null;
  routingReason: string | null;
  fee: number | null;
  createdAt: string;
  events: PolicyStatusEvent[];
}

export const policyStatusService = {
  lookup: async (email: string, policyNumber: string): Promise<{ policyId: string }> => {
    const { data } = await api.get<ApiResponse<{ policyId: string }>>(API.POLICY.LOOKUP, {
      params: { email: email.trim(), policyNumber: policyNumber.trim() },
    });
    return data.data;
  },

  getStatus: async (policyId: string): Promise<PolicyStatus> => {
    const { data } = await api.get<ApiResponse<PolicyStatus>>(API.POLICY.STATUS(policyId));
    return data.data;
  },
};
