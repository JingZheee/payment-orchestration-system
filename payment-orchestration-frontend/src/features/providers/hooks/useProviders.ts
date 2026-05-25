import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providerService } from '../services/providerService';

const QK_LIST    = ['providers'];
const QK_SUMMARY = ['providers', 'summary'];

export function useProviders() {
  return useQuery({
    queryKey: QK_LIST,
    queryFn: providerService.getAll,
  });
}

export function useProviderSummaries() {
  return useQuery({
    queryKey: QK_SUMMARY,
    queryFn: providerService.getSummaries,
  });
}

export function useToggleProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, enabled }: { provider: string; enabled: boolean }) =>
      providerService.toggle(provider, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_LIST });
      qc.invalidateQueries({ queryKey: QK_SUMMARY });
    },
  });
}
