package com.paymentorchestration.common.enums;

public enum Provider {
    BILLPLZ,   // Malaysia — FPX bank transfer
    MIDTRANS,  // Indonesia — Virtual Account, QRIS
    PAYMONGO,  // Philippines — Maya, cards, e-wallets
    MOCK       // All regions — controllable success/failure for testing
}
