import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routingRuleService } from '../services/routingRuleService';
import type { RoutingRuleRequest } from '../../../shared/types/routing';

const QK = ['routing-rules'];

export function useRoutingRules() {
  return useQuery({
    queryKey: QK,
    queryFn: routingRuleService.getAll,
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: RoutingRuleRequest) => routingRuleService.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useUpdateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: number; req: RoutingRuleRequest }) =>
      routingRuleService.update(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => routingRuleService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
