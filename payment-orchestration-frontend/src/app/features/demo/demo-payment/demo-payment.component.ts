import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { PaymentService } from '../../../core/services/payment.service';
import { InitiatePaymentRequest, InitiatePaymentResponse } from '../../../core/models/payment.model';
import { Currency, PaymentMethod, Region } from '../../../core/models/enums';

@Component({
  selector: 'app-demo-payment',
  standalone: true,
  imports: [
    ReactiveFormsModule, NgIf,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatDividerModule, MatTooltipModule, MatSnackBarModule
  ],
  templateUrl: './demo-payment.component.html',
  styleUrl: './demo-payment.component.scss'
})
export class DemoPaymentComponent {
  form: FormGroup;
  submitting = false;
  result: InitiatePaymentResponse | null = null;

  readonly regionCurrencyMap: Record<Region, Currency> = {
    [Region.MY]: Currency.MYR,
    [Region.ID]: Currency.IDR,
    [Region.PH]: Currency.PHP
  };

  // Default method per region — hidden from user, sent to backend
  readonly regionMethodMap: Record<Region, PaymentMethod> = {
    [Region.MY]: PaymentMethod.FPX,
    [Region.ID]: PaymentMethod.VIRTUAL_ACCOUNT,
    [Region.PH]: PaymentMethod.MAYA
  };

  readonly providerColors: Record<string, string> = {
    BILLPLZ: '#1976d2',
    MIDTRANS: '#0F4C81',
    PAYMONGO: '#6366f1',
    MOCK: '#757575'
  };

  readonly statusColors: Record<string, string> = {
    SUCCESS: '#388e3c',
    FAILED: '#d32f2f',
    PROCESSING: '#f57c00',
    PENDING: '#757575',
    RETRY_EXHAUSTED: '#d32f2f',
    REFUNDED: '#0288d1',
    CANCELLED: '#757575'
  };

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      merchantOrderId: [this.generateOrderId(), Validators.required],
      region: [Region.MY, Validators.required],
      amount: [100, [Validators.required, Validators.min(0.01)]],
      currency: [{ value: Currency.MYR, disabled: true }],
      customerEmail: ['demo@example.com', [Validators.required, Validators.email]],
      description: ['Test payment via demo'],
      redirectUrl: ['http://localhost:4200/payment-result', Validators.required]
    });

    this.form.get('region')!.valueChanges.subscribe((region: Region) => {
      this.form.get('currency')!.setValue(this.regionCurrencyMap[region]);
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.result = null;

    const raw = this.form.getRawValue();
    const request: InitiatePaymentRequest = {
      merchantOrderId: raw.merchantOrderId,
      amount: raw.amount,
      currency: raw.currency,
      region: raw.region,
      paymentMethod: this.regionMethodMap[raw.region as Region],
      customerEmail: raw.customerEmail,
      description: raw.description,
      redirectUrl: raw.redirectUrl
    };

    const idempotencyKey = crypto.randomUUID();
    this.paymentService.initiate(request, idempotencyKey).subscribe({
      next: (response) => {
        this.result = response;
        this.submitting = false;
      },
      error: (err) => {
        this.submitting = false;
        this.snackBar.open(err?.error?.message ?? 'Payment initiation failed', 'Close', { duration: 5000 });
      }
    });
  }

  regenerateOrderId(): void {
    this.form.get('merchantOrderId')!.setValue(this.generateOrderId());
  }

  viewTransaction(): void {
    if (this.result) this.router.navigate(['/transactions', this.result.transactionId]);
  }

  openRedirectUrl(): void {
    if (this.result?.redirectUrl) window.open(this.result.redirectUrl, '_blank');
  }

  private generateOrderId(): string {
    return 'ORDER-' + Date.now().toString().slice(-6);
  }
}
