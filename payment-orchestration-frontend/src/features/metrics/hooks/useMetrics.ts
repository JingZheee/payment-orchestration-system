import { useQuery } from '@tanstack/react-query';
import { metricsService } from '../services/metricsService';

export function useMetrics(windowMinutes: number) {
  return useQuery({
    queryKey: ['metrics', windowMinutes],
    queryFn: () => metricsService.getAll(windowMinutes),
    refetchInterval: 60_000,
  });
}
