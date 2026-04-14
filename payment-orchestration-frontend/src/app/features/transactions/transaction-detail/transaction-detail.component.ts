import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgFor, NgIf, DatePipe, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PaymentService } from '../../../core/services/payment.service';
import { Transaction, TransactionDetail, TransactionEvent } from '../../../core/models/transaction.model';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, CurrencyPipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatDividerModule, MatProgressSpinnerModule
  ],
  templateUrl: './transaction-detail.component.html',
  styleUrl: './transaction-detail.component.scss'
})
export class TransactionDetailComponent implements OnInit {
  detail: TransactionDetail | null = null;
  loading = true;
  error: string | null = null;

  readonly statusColors: Record<string, string> = {
    SUCCESS: '#388e3c',
    FAILED: '#d32f2f',
    PROCESSING: '#f57c00',
    PENDING: '#757575',
    RETRY_EXHAUSTED: '#d32f2f',
    REFUNDED: '#0288d1',
    CANCELLED: '#757575'
  };

  readonly providerColors: Record<string, string> = {
    BILLPLZ: '#1976d2',
    MIDTRANS: '#0F4C81',
    PAYMONGO: '#6366f1',
    MOCK: '#757575'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.paymentService.getTransaction(id).subscribe({
      next: (detail) => { this.detail = detail; this.loading = false; },
      error: () => { this.error = 'Transaction not found'; this.loading = false; }
    });
  }

  get transaction(): Transaction | null {
    return this.detail?.transaction ?? null;
  }

  get events(): TransactionEvent[] {
    return this.detail?.events ?? [];
  }

  getEventIcon(eventType: string): string {
    const icons: Record<string, string> = {
      INITIATED: 'play_circle',
      ROUTED: 'alt_route',
      PROVIDER_CALLED: 'send',
      WEBHOOK_RECEIVED: 'webhook',
      STATUS_CHANGED: 'sync',
      SUCCESS: 'check_circle',
      FAILED: 'cancel',
      RETRY_SCHEDULED: 'schedule',
      RETRY_EXHAUSTED: 'error'
    };
    return icons[eventType] ?? 'circle';
  }

  getEventColor(eventType: string): string {
    if (eventType.includes('FAIL') || eventType.includes('ERROR')) return '#d32f2f';
    if (eventType.includes('SUCCESS')) return '#388e3c';
    if (eventType.includes('RETRY')) return '#f57c00';
    return '#1976d2';
  }

  back(): void {
    this.router.navigate(['/demo']);
  }
}
