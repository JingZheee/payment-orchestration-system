import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse, Page } from '../../../shared/types';
import type { ReconStatement, ReconSummary, ReconImportResult } from '../../../shared/types/recon';
import type { Provider } from '../../../shared/types/enums';

export interface ReconFilters {
  provider?: Provider;
  anomaliesOnly?: boolean;
  page?: number;
  size?: number;
}

export const reconService = {
  getAll: async (filters: ReconFilters): Promise<Page<ReconStatement>> => {
    const endpoint = filters.anomaliesOnly ? API.RECON.ANOMALIES : API.RECON.LIST;
    const params: Record<string, unknown> = {
      page: filters.page ?? 0,
      size: filters.size ?? 20,
    };
    if (filters.provider) params.provider = filters.provider;

    const { data } = await api.get<ApiResponse<Page<ReconStatement>>>(endpoint, { params });
    return data.data;
  },

  getSummary: async (): Promise<ReconSummary> => {
    const { data } = await api.get<ApiResponse<ReconSummary>>(API.RECON.SUMMARY);
    return data.data;
  },

  importFile: async (file: File): Promise<ReconImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ApiResponse<ReconImportResult>>(API.RECON.IMPORT, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
};
