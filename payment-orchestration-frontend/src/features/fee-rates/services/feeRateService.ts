import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';
import type { FeeRate, FeeRateUpdateRequest } from '../../../shared/types/feeRate';

export const feeRateService = {
  getAll: async (): Promise<FeeRate[]> => {
    const { data } = await api.get<ApiResponse<FeeRate[]>>(API.FEE_RATES.LIST);
    return data.data;
  },

  update: async (id: number, req: FeeRateUpdateRequest): Promise<FeeRate> => {
    const { data } = await api.put<ApiResponse<FeeRate>>(API.FEE_RATES.BY_ID(id), req);
    return data.data;
  },
};
