import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { LoginRequest, LoginResponse, RegisterRequest } from '../models/auth.model';
import { UserRole } from '../models/enums';
import { map } from 'rxjs/operators';

const TOKEN_KEY = 'pos_access_token';
const REFRESH_KEY = 'pos_refresh_token';
const ROLE_KEY = 'pos_role';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    const req: LoginRequest = { email, password };
    return this.http.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', req).pipe(
      map(res => { if (!res.success) throw new Error(res.message ?? 'Login failed'); return res.data; }),
      tap(data => this.storeTokens(data))
    );
  }

  register(email: string, password: string, role: UserRole): Observable<LoginResponse> {
    const req: RegisterRequest = { email, password, role };
    return this.http.post<ApiResponse<LoginResponse>>('/api/v1/auth/register', req).pipe(
      map(res => { if (!res.success) throw new Error(res.message ?? 'Registration failed'); return res.data; }),
      tap(data => this.storeTokens(data))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLE_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRole(): UserRole | null {
    return localStorage.getItem(ROLE_KEY) as UserRole | null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private storeTokens(data: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    localStorage.setItem(ROLE_KEY, data.role);
  }
}
