import { useQuery } from '@tanstack/react-query';
import { reconService } from '../services/reconService';

export function useReconSummary() {
  return useQuery({
    queryKey: ['recon-summary'],
    queryFn: () => reconService.getSummary(),
  });
}
