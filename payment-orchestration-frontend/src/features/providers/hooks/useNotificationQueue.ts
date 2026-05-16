import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationQueueService } from '../services/notificationQueueService';

const QK = ['notificationQueue', 'status'];

export function useNotificationQueueStatus() {
  return useQuery({
    queryKey: QK,
    queryFn: notificationQueueService.getStatus,
    refetchInterval: 3000,
  });
}

export function useToggleNotificationConsumer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ active }: { active: boolean }) =>
      active
        ? notificationQueueService.startConsumer()
        : notificationQueueService.stopConsumer(),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
