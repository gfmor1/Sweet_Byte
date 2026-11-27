package com.sweetbyte.eats.application.exceptions;

// R-PROMO-02: the message is what the console shows the customer.
public class PromoRefusedException extends RuntimeException {
    public PromoRefusedException(String message) {
        super(message);
    }
}