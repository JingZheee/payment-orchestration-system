import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentMethodService } from '../services/paymentMethodService';
import type {
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
} from '../../../shared/types/paymentMethod';

const KEY = ['payment-methods'];

export function usePaymentMethods() {
  return useQuery({ queryKey: KEY, queryFn: paymentMethodService.getAll });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreatePaymentMethodRequest) => paymentMethodService.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ region, code, req }: { region: string; code: string; req: UpdatePaymentMethodRequest }) =>
      paymentMethodService.update(region, code, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ region, code }: { region: string; code: string }) =>
      paymentMethodService.remove(region, code),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
