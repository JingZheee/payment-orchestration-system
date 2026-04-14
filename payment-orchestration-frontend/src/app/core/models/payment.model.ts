import { Currency, PaymentMethod, PaymentStatus, Provider, Region, RoutingStrategy } from './enums';

export interface InitiatePaymentRequest {
  merchantOrderId: string;
  amount: number;
  currency: Currency;
  region: Region;
  paymentMethod: PaymentMethod;
  customerEmail: string;
  description?: string;
  redirectUrl: string;
}

export interface InitiatePaymentResponse {
  transactionId: string;
  providerTransactionId: string;
  status: PaymentStatus;
  provider: Provider;
  routingStrategy: RoutingStrategy;
  routingReason: string;
  fee: number;
  redirectUrl: string | null;
  createdAt: string;
}

export interface AvailableMethod {
  paymentMethod: PaymentMethod;
  provider: Provider;
  fee: number;
  feeDescription: string;
}
