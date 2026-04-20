import { useQuery } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';

export function useTransactionDetail(id: string | null) {
  return useQuery({
    queryKey: ['transactions', 'detail', id],
    queryFn: () => transactionService.getDetail(id!),
    enabled: !!id,
  });
}
