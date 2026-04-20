import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import type { CompareParams } from '../services/dashboardService';

export function useStrategyComparison(params: CompareParams | null) {
  return useQuery({
    queryKey: ['dashboard', 'strategy-comparison', params],
    queryFn: () => dashboardService.getStrategyComparison(params!),
    enabled: !!params,
  });
}
