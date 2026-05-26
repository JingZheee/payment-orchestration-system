import { useQuery } from '@tanstack/react-query';
import { transactionService } from '../../transactions/services/transactionService';
import { PaymentStatus } from '../../../shared/types/enums';

export function useDlqTransactions(page: number, size: number) {
  return useQuery({
    queryKey: ['dlq', page, size],
    queryFn: () =>
      transactionService.getList({
        status: PaymentStatus.RETRY_EXHAUSTED,
        page,
        size,
        sort: 'updatedAt,desc',
      }),
    refetchInterval: 30_000,
  });
}
