import { useQuery } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import type { TransactionFilters } from '../services/transactionService';

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionService.getList(filters),
  });
}
