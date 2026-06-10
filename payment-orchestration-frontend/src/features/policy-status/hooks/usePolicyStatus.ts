import { useMutation, useQuery } from '@tanstack/react-query';
import { policyStatusService } from '../services/policyStatusService';

export function usePolicyStatus(policyId: string) {
  return useQuery({
    queryKey: ['policy-status', policyId],
    queryFn: () => policyStatusService.getStatus(policyId),
    enabled: !!policyId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'PROCESSING' ? 5000 : false;
    },
  });
}

export function usePolicyLookup() {
  return useMutation({
    mutationFn: ({ email, policyNumber }: { email: string; policyNumber: string }) =>
      policyStatusService.lookup(email, policyNumber),
  });
}
