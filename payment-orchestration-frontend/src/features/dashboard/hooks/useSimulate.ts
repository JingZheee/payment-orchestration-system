import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import type { CompareParams } from '../services/dashboardService';

export function useSimulate(params: CompareParams | null) {
  return useQuery({
    queryKey: ['dashboard', 'simulate', params],
    queryFn: () => dashboardService.simulate(params!),
    enabled: !!params,
  });
}
