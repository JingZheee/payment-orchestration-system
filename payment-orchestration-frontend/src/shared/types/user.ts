import type { UserRole } from './enums';

export interface UserRecord {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateRoleRequest {
  role: UserRole;
}
