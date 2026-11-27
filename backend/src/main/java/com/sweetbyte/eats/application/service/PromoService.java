package com.sweetbyte.eats.application.service;

import java.math.BigDecimal;

// PROMO: validates the single promo code carried by a placement request.
public interface PromoService {

    // R-PROMO-01: validated at placement time, at most one code per order.
    // Returns the discount to apply to the computed fare.
    // Throws PromoRefusedException with the message shown in the console when the code is
    // unknown, expired, or the subtotal is below the code's minimum (R-PROMO-02).
    BigDecimal validate(String code, BigDecimal subtotal);
}