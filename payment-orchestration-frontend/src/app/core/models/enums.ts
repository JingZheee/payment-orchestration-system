export enum Region {
  MY = 'MY',
  ID = 'ID',
  PH = 'PH'
}

export enum Currency {
  MYR = 'MYR',
  IDR = 'IDR',
  PHP = 'PHP'
}

export enum PaymentMethod {
  FPX = 'FPX',
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT',
  QRIS = 'QRIS',
  GOPAY = 'GOPAY',
  MAYA = 'MAYA',
  GCASH = 'GCASH',
  GRABPAY = 'GRABPAY',
  CARD = 'CARD',
  EWALLET = 'EWALLET'
}

export enum Provider {
  BILLPLZ = 'BILLPLZ',
  MIDTRANS = 'MIDTRANS',
  PAYMONGO = 'PAYMONGO',
  MOCK = 'MOCK'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED'
}

export enum RoutingStrategy {
  REGION_BASED = 'REGION_BASED',
  SUCCESS_RATE = 'SUCCESS_RATE',
  LOWEST_FEE = 'LOWEST_FEE',
  COMPOSITE_SCORE = 'COMPOSITE_SCORE'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
  MERCHANT = 'MERCHANT'
}
