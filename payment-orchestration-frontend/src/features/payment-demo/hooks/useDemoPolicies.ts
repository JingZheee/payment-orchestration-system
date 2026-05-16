import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { demoPolicyService, type CreateDemoPolicyRequest } from '../services/demoPolicyService';

const QK = ['demoPolicies'];

export function useDemoPolicies() {
  return useQuery({
    queryKey: QK,
    queryFn: demoPolicyService.getAll,
    refetchInterval: 4000,
  });
}

export function useCreateDemoPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateDemoPolicyRequest) => demoPolicyService.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteDemoPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => demoPolicyService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
