import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';
import type {
  PaymentMethodConfig,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
} from '../../../shared/types/paymentMethod';

export const paymentMethodService = {
  getAll: async (): Promise<PaymentMethodConfig[]> => {
    const { data } = await api.get<ApiResponse<PaymentMethodConfig[]>>(API.PAYMENT_METHODS.LIST);
    return data.data;
  },

  create: async (req: CreatePaymentMethodRequest): Promise<PaymentMethodConfig> => {
    const { data } = await api.post<ApiResponse<PaymentMethodConfig>>(API.PAYMENT_METHODS.LIST, req);
    return data.data;
  },

  update: async (region: string, code: string, req: UpdatePaymentMethodRequest): Promise<PaymentMethodConfig> => {
    const { data } = await api.put<ApiResponse<PaymentMethodConfig>>(
      API.PAYMENT_METHODS.BY_KEY(region, code),
      req,
    );
    return data.data;
  },

  remove: async (region: string, code: string): Promise<void> => {
    await api.delete(API.PAYMENT_METHODS.BY_KEY(region, code));
  },
};
