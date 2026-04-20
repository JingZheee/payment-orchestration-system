import api from '../../../lib/axios';
import { API } from '../../../lib/endpoints';
import type { ApiResponse } from '../../../shared/types';
import type { LoginRequest, LoginResponse } from '../../../shared/types/auth';

export const authService = {
  login: async (req: LoginRequest): Promise<LoginResponse> => {
    const { data } = await api.post<ApiResponse<LoginResponse>>(API.AUTH.LOGIN, req);
    return data.data;
  },

  register: async (req: LoginRequest & { role: string }): Promise<LoginResponse> => {
    const { data } = await api.post<ApiResponse<LoginResponse>>(API.AUTH.REGISTER, req);
    return data.data;
  },

  logout: (): void => {
    localStorage.removeItem('pos_access_token');
    localStorage.removeItem('pos_refresh_token');
    localStorage.removeItem('pos_role');
    window.location.href = '/login';
  },
};
