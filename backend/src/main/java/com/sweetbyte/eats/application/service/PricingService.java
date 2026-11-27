package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.model.Fare;
import com.sweetbyte.eats.application.model.Order;

import java.math.BigDecimal;

import com.sweetbyte.eats.application.model.BillingRecord;
import com.sweetbyte.eats.application.model.PricingConfig;

public interface PricingService {
    Fare computeFare(Order order);          // pure calculation, no DB
    Fare computeFare(Order order, BigDecimal discount); // PROMO: same fare, minus the validated discount
    Fare computeFare(Order order, BigDecimal discount, String promoCode); // PROMO: also remembers which code
    BillingRecord recordFare(Order order);  // the order's PAYMENT billing row; created once, right after the order is saved
    BillingRecord recordFare(Order order, BigDecimal discount);
    BillingRecord recordFare(Order order, BigDecimal discount, String promoCode);
    Fare getFare(Long orderId);             // reads the stored fare, never recomputes
    PricingConfig getConfig();
}