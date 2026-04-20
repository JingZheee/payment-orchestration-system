import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import type { ScoreParams } from '../services/dashboardService';

export function useProviderScores(params: ScoreParams | null) {
  return useQuery({
    queryKey: ['dashboard', 'scores', params],
    queryFn: () => dashboardService.getScores(params!),
    enabled: !!params,
  });
}
