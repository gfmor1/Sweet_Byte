package com.sweetbyte.eats.application.pricing;

import java.math.BigDecimal;

import com.sweetbyte.eats.application.model.Order;

// PROMO: applied to the computed fare, so it wraps the whole fee chain.
public class PromoDiscountDecorator extends FareCalculatorDecorator {

    private final BigDecimal discount;

    public PromoDiscountDecorator(FareCalculator inner, BigDecimal discount) {
        super(inner);
        this.discount = discount;
    }

    @Override
    public FareDraft calculate(Order order) {
        return inner.calculate(order).withDiscount(discount);
    }
}