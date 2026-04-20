import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';
import type { ProviderConfig } from '../../../shared/types/provider';

export const providerService = {
  getAll: async (): Promise<ProviderConfig[]> => {
    const { data } = await api.get<ApiResponse<ProviderConfig[]>>(API.PROVIDERS.LIST);
    return data.data;
  },

  toggle: async (provider: string, enabled: boolean): Promise<ProviderConfig> => {
    const { data } = await api.post<ApiResponse<ProviderConfig>>(
      API.PROVIDERS.TOGGLE(provider),
      null,
      { params: { enabled } },
    );
    return data.data;
  },
};
