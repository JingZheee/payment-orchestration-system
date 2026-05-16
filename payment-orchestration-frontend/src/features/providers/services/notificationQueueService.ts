import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';

export interface NotificationQueueStatus {
  consumerActive: boolean;
  queueDepth: number;
}

export const notificationQueueService = {
  getStatus: async (): Promise<NotificationQueueStatus> => {
    const { data } = await api.get<ApiResponse<NotificationQueueStatus>>(
      API.NOTIFICATION_QUEUE.STATUS,
    );
    return data.data;
  },

  startConsumer: async (): Promise<NotificationQueueStatus> => {
    const { data } = await api.post<ApiResponse<NotificationQueueStatus>>(
      API.NOTIFICATION_QUEUE.START,
    );
    return data.data;
  },

  stopConsumer: async (): Promise<NotificationQueueStatus> => {
    const { data } = await api.post<ApiResponse<NotificationQueueStatus>>(
      API.NOTIFICATION_QUEUE.STOP,
    );
    return data.data;
  },
};
