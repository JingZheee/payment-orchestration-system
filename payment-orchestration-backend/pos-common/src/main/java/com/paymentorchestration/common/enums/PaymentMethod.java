package com.paymentorchestration.common.enums;

public enum PaymentMethod {
    FPX,             // Malaysia — bank transfer (Billplz)
    VIRTUAL_ACCOUNT, // Indonesia — Midtrans
    QRIS,            // Indonesia — QR code (Midtrans)
    GOPAY,           // Indonesia — GoPay wallet (Midtrans)
    MAYA,            // Philippines — Maya wallet (PayMongo)
    CARD,            // Philippines — credit/debit card (PayMongo)
    EWALLET          // Generic e-wallet (Mock, PayMongo)
}
