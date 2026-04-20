import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feeRateService } from '../services/feeRateService';
import type { FeeRateUpdateRequest } from '../../../shared/types/feeRate';

const QK = ['fee-rates'];

export function useFeeRates() {
  return useQuery({
    queryKey: QK,
    queryFn: feeRateService.getAll,
  });
}

export function useUpdateFeeRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: number; req: FeeRateUpdateRequest }) =>
      feeRateService.update(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
