import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';
import type { InitiatePaymentRequest, InitiatePaymentResponse } from '../../../shared/types/transaction';

export const paymentDemoService = {
  initiatePayment: async (
    request: InitiatePaymentRequest,
    idempotencyKey: string,
  ): Promise<InitiatePaymentResponse> => {
    const { data } = await api.post<ApiResponse<InitiatePaymentResponse>>(
      API.PAYMENTS.INITIATE,
      request,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return data.data;
  },
};
