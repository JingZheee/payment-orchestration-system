import type { Provider, Region, Currency, PaymentStatus, RoutingStrategy, PaymentType } from './enums';

export interface Transaction {
  id: string;
  merchantOrderId: string;
  policyNumber: string | null;
  claimReference: string | null;
  paymentType: PaymentType;
  amount: number;
  currency: Currency;
  region: Region;
  status: PaymentStatus;
  provider: Provider;
  paymentMethod: string | null;
  routingReason: string | null;
  routingStrategy: RoutingStrategy | null;
  providerTransactionId: string | null;
  redirectUrl: string | null;
  fee: number | null;
  customerEmail: string | null;
  description: string | null;
  idempotencyKey: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionEvent {
  id: string;
  transactionId: string;
  eventType: string;
  description: string;
  createdAt: string;
}

export interface TransactionDetail {
  transaction: Transaction;
  events: TransactionEvent[];
}

export interface InitiatePaymentRequest {
  merchantOrderId: string;
  policyNumber?: string;
  claimReference?: string;
  paymentType: PaymentType;
  amount: number;
  currency: Currency;
  region: Region;
  paymentMethod: string;
  customerEmail: string;
  description?: string;
  redirectUrl: string;
}

export interface InitiatePaymentResponse {
  transactionId: string;
  providerTransactionId: string | null;
  status: PaymentStatus;
  provider: Provider;
  paymentType: PaymentType;
  policyNumber: string | null;
  routingStrategy: RoutingStrategy;
  routingReason: string;
  fee: number;
  redirectUrl: string | null;
  createdAt: string;
}
