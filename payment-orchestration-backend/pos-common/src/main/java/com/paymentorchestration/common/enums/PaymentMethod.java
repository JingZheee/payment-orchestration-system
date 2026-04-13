package com.paymentorchestration.common.enums;

public enum PaymentMethod {
    FPX,             // Malaysia — FPX bank transfer (Billplz)
    VIRTUAL_ACCOUNT, // Indonesia — bank virtual account (Midtrans)
    QRIS,            // Indonesia — QR code payment (Midtrans)
    GOPAY,           // Indonesia — GoPay e-wallet (Midtrans)
    MAYA,            // Philippines — Maya wallet (PayMongo)
    GCASH,           // Philippines — GCash wallet (PayMongo)
    GRABPAY,         // Philippines — GrabPay (PayMongo)
    CARD,            // All regions — credit/debit card
    EWALLET          // Generic fallback e-wallet
}
