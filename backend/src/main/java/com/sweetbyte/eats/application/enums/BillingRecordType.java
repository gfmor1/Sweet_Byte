package com.sweetbyte.eats.application.enums;

// One billing row per money movement for an order.
public enum BillingRecordType {
    PAYMENT,    // customer paid the fare at placement (amount > 0)
    REFUND      // the fare went back to the customer (amount < 0)
}
