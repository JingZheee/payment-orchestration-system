import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';
import type { TransactionSummary, ScoreDetail, StrategyComparison } from '../../../shared/types/dashboard';
import type { Region, Currency } from '../../../shared/types/enums';

export interface ScoreParams {
  region: Region;
  amount: number;
  currency: Currency;
  paymentMethod?: string;
}

export interface CompareParams {
  region: Region;
  amount: number;
  currency: Currency;
}

export const dashboardService = {
  getSummary: async (): Promise<TransactionSummary> => {
    const { data } = await api.get<ApiResponse<TransactionSummary>>(API.DASHBOARD.SUMMARY);
    return data.data;
  },

  getScores: async (params: ScoreParams): Promise<ScoreDetail[]> => {
    const { data } = await api.get<ApiResponse<ScoreDetail[]>>(API.DASHBOARD.SCORES, { params });
    return data.data;
  },

  getStrategyComparison: async (params: CompareParams): Promise<StrategyComparison[]> => {
    const { data } = await api.get<ApiResponse<StrategyComparison[]>>(
      API.DASHBOARD.STRATEGY_COMPARISON,
      { params },
    );
    return data.data;
  },
};
