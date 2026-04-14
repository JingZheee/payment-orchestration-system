import { Currency, PaymentMethod, PaymentStatus, Provider, Region, RoutingStrategy } from './enums';

export interface Transaction {
  id: string;
  merchantOrderId: string;
  amount: number;
  currency: Currency;
  region: Region;
  status: PaymentStatus;
  provider: Provider;
  providerTransactionId: string;
  routingStrategy: RoutingStrategy;
  routingReason: string;
  fee: number;
  paymentMethod: PaymentMethod;
  customerEmail: string;
  redirectUrl: string | null;
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
