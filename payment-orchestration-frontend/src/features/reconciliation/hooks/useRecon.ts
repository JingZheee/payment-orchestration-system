import { useQuery } from '@tanstack/react-query';
import { reconService } from '../services/reconService';
import type { ReconFilters } from '../services/reconService';

export function useRecon(filters: ReconFilters) {
  return useQuery({
    queryKey: ['recon', filters],
    queryFn: () => reconService.getAll(filters),
  });
}
