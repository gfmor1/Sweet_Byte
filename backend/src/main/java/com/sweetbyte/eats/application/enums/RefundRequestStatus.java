package com.sweetbyte.eats.application.enums;

// Lifecycle of a customer's refund request: PENDING -> APPROVED | REJECTED (both final).
public enum RefundRequestStatus {
    PENDING,
    APPROVED,
    REJECTED
}
