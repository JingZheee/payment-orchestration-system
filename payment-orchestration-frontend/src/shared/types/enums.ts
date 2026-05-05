export enum Provider {
  BILLPLZ = 'BILLPLZ',
  MIDTRANS = 'MIDTRANS',
  PAYMONGO = 'PAYMONGO',
  MOCK = 'MOCK',
}

export enum Region {
  MY = 'MY',
  ID = 'ID',
  PH = 'PH',
}

export enum Currency {
  MYR = 'MYR',
  IDR = 'IDR',
  PHP = 'PHP',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
}

// Payment methods are now DB-driven — use string literals instead of this enum.
// Kept as a const object for display/label mapping only.
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  FPX: 'FPX Bank Transfer',
  VIRTUAL_ACCOUNT: 'Virtual Account',
  QRIS: 'QRIS Payment',
  GOPAY: 'GoPay',
  MAYA: 'Maya Wallet',
  GCASH: 'GCash',
  GRABPAY: 'GrabPay',
  CARD: 'Credit / Debit Card',
  EWALLET: 'E-Wallet',
};

export enum RoutingStrategy {
  REGION_BASED = 'REGION_BASED',
  LOWEST_FEE = 'LOWEST_FEE',
  SUCCESS_RATE = 'SUCCESS_RATE',
  COMPOSITE_SCORE = 'COMPOSITE_SCORE',
}

export enum FeeType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
  FIXED_PLUS_PERCENTAGE = 'FIXED_PLUS_PERCENTAGE',
}

export enum PaymentType {
  PREMIUM_COLLECTION = 'PREMIUM_COLLECTION',
  CLAIMS_DISBURSEMENT = 'CLAIMS_DISBURSEMENT',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
  MERCHANT = 'MERCHANT',
}
