import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse, Page } from '../../../shared/types';
import type { Transaction, TransactionEvent } from '../../../shared/types/transaction';
import type { PaymentStatus, Provider, Region } from '../../../shared/types/enums';

export interface TransactionFilters {
  status?: PaymentStatus;
  provider?: Provider;
  region?: Region;
  page?: number;
  size?: number;
}

export interface TransactionDetail {
  transaction: Transaction;
  events: TransactionEvent[];
}

export const transactionService = {
  getList: async (filters: TransactionFilters): Promise<Page<Transaction>> => {
    const params: Record<string, unknown> = {
      page: filters.page ?? 0,
      size: filters.size ?? 20,
      sort: 'createdAt,desc',
    };
    if (filters.status)   params.status   = filters.status;
    if (filters.provider) params.provider = filters.provider;
    if (filters.region)   params.region   = filters.region;

    const { data } = await api.get<ApiResponse<Page<Transaction>>>(API.TRANSACTIONS.LIST, { params });
    return data.data;
  },

  getDetail: async (id: string): Promise<TransactionDetail> => {
    const { data } = await api.get<ApiResponse<TransactionDetail>>(API.TRANSACTIONS.DETAIL(id));
    return data.data;
  },
};
