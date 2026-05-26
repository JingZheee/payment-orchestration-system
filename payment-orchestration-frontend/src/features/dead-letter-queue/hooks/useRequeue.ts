import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';

export function useRequeue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(API.TRANSACTIONS.REQUEUE(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dlq'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
