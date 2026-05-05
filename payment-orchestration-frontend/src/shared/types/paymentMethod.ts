export interface PaymentMethodConfig {
  code: string;
  region: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface CreatePaymentMethodRequest {
  code: string;
  region: string;
  name: string;
}

export interface UpdatePaymentMethodRequest {
  name?: string;
  active?: boolean;
}
