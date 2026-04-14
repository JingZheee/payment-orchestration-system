import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ApiService {

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => { if (v != null) httpParams = httpParams.set(k, v); });
    }
    return this.http.get<ApiResponse<T>>(path, { params: httpParams }).pipe(
      map(res => this.unwrap(res)),
      catchError(err => throwError(() => err))
    );
  }

  post<T>(path: string, body: unknown, headers?: HttpHeaders): Observable<T> {
    return this.http.post<ApiResponse<T>>(path, body, { headers }).pipe(
      map(res => this.unwrap(res)),
      catchError(err => throwError(() => err))
    );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) throw new Error(res.message ?? 'Request failed');
    return res.data;
  }
}
