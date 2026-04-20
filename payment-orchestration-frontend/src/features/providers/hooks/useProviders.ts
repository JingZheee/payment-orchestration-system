import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providerService } from '../services/providerService';

const QK = ['providers'];

export function useProviders() {
  return useQuery({
    queryKey: QK,
    queryFn: providerService.getAll,
  });
}

export function useToggleProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, enabled }: { provider: string; enabled: boolean }) =>
      providerService.toggle(provider, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
