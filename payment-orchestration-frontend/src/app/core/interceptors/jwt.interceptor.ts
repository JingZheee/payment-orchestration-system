import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const skipPaths = ['/auth/login', '/auth/register'];
  const shouldSkip = skipPaths.some(p => req.url.includes(p));

  if (!shouldSkip) {
    const token = authService.getToken();
    if (token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(req);
};
