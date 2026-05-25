package com.paymentorchestration.common.enums;

public enum Provider {
    BILLPLZ,   // Malaysia — FPX bank transfer
    MIDTRANS,  // Indonesia — Virtual Account, QRIS
    PAYMONGO,  // Philippines — disabled, replaced by Xendit
    XENDIT,    // Philippines — GCash, Maya, GrabPay, cards + claim disbursements
    MOCK       // All regions — controllable success/failure for testing
}
