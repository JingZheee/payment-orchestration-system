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

export enum PaymentMethod {
  FPX = 'FPX',
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT',
  QRIS = 'QRIS',
  CARD = 'CARD',
  E_WALLET = 'E_WALLET',
  MAYA = 'MAYA',
}

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
  CLAIM_PAYOUT = 'CLAIM_PAYOUT',
  REFUND = 'REFUND',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
  MERCHANT = 'MERCHANT',
}
