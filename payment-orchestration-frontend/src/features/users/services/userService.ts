import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';
import type { UserRecord, CreateUserRequest, UpdateRoleRequest } from '../../../shared/types/user';

export const userService = {
  getAll: async (): Promise<UserRecord[]> => {
    const { data } = await api.get<ApiResponse<UserRecord[]>>(API.USERS.LIST);
    return data.data;
  },

  create: async (req: CreateUserRequest): Promise<UserRecord> => {
    const { data } = await api.post<ApiResponse<UserRecord>>(API.USERS.LIST, req);
    return data.data;
  },

  updateRole: async (id: string, req: UpdateRoleRequest): Promise<UserRecord> => {
    const { data } = await api.put<ApiResponse<UserRecord>>(API.USERS.BY_ID(id), req);
    return data.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(API.USERS.BY_ID(id));
  },
};
