import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AvailableMethod, InitiatePaymentRequest, InitiatePaymentResponse } from '../models/payment.model';
import { TransactionDetail } from '../models/transaction.model';
import { Region } from '../models/enums';

@Injectable({ providedIn: 'root' })
export class PaymentService {

  constructor(private api: ApiService) {}

  getMethods(region: Region, amount: number): Observable<AvailableMethod[]> {
    return this.api.get<AvailableMethod[]>('/api/v1/payments/methods', {
      region,
      amount: amount.toString()
    });
  }

  initiate(request: InitiatePaymentRequest, idempotencyKey: string): Observable<InitiatePaymentResponse> {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.api.post<InitiatePaymentResponse>('/api/v1/payments/initiate', request, headers);
  }

  getTransaction(id: string): Observable<TransactionDetail> {
    return this.api.get<TransactionDetail>(`/api/v1/payments/${id}`);
  }
}
