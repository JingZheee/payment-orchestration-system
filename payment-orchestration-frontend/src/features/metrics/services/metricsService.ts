import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';
import type { ProviderMetrics } from '../../../shared/types/metrics';

export const metricsService = {
  getAll: async (windowMinutes: number): Promise<ProviderMetrics[]> => {
    const { data } = await api.get<ApiResponse<ProviderMetrics[]>>(API.METRICS.LIST, {
      params: { windowMinutes },
    });
    return data.data;
  },
};
