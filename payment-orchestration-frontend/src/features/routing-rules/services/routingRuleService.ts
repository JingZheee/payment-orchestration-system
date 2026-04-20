import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';
import type { RoutingRule, RoutingRuleRequest } from '../../../shared/types/routing';

export const routingRuleService = {
  getAll: async (): Promise<RoutingRule[]> => {
    const { data } = await api.get<ApiResponse<RoutingRule[]>>(API.ROUTING_RULES.LIST);
    return data.data;
  },

  create: async (req: RoutingRuleRequest): Promise<RoutingRule> => {
    const { data } = await api.post<ApiResponse<RoutingRule>>(API.ROUTING_RULES.LIST, req);
    return data.data;
  },

  update: async (id: number, req: RoutingRuleRequest): Promise<RoutingRule> => {
    const { data } = await api.put<ApiResponse<RoutingRule>>(API.ROUTING_RULES.BY_ID(id), req);
    return data.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(API.ROUTING_RULES.BY_ID(id));
  },
};
