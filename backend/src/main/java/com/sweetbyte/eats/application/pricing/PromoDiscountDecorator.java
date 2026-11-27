package com.sweetbyte.eats.application.pricing;

import java.math.BigDecimal;

import com.sweetbyte.eats.application.model.Order;

// PROMO: applied to the computed fare, so it wraps the whole fee chain.
public class PromoDiscountDecorator extends FareCalculatorDecorator {

    private final BigDecimal discount;
    private final String promoCode;

    public PromoDiscountDecorator(FareCalculator inner, BigDecimal discount) {
        this(inner, discount, null);
    }

    public PromoDiscountDecorator(FareCalculator inner, BigDecimal discount, String promoCode) {
        super(inner);
        this.discount = discount;
        this.promoCode = promoCode;
    }

    @Override
    public FareDraft calculate(Order order) {
        return inner.calculate(order).withDiscount(discount).withPromoCode(promoCode);
    }
}