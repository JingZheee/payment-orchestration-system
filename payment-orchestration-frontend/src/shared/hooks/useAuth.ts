import { UserRole } from '../types';

export function useAuth() {
  const role = localStorage.getItem('pos_role') as UserRole | null;
  const isAdmin = role === UserRole.ADMIN;
  const isViewer = role === UserRole.VIEWER;
  const isLoggedIn = !!localStorage.getItem('pos_access_token');

  return { role, isAdmin, isViewer, isLoggedIn };
}
