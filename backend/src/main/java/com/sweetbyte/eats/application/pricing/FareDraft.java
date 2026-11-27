package com.sweetbyte.eats.application.pricing;

import com.sweetbyte.eats.application.model.Fare;

import java.math.BigDecimal;


//Fare being built one component (fare elements) at a time by decorator chain
public record FareDraft(BigDecimal subtotal, BigDecimal deliveryFee, BigDecimal serviceFee,
                        BigDecimal smallOrderSurcharge, BigDecimal discount, String promoCode) {

    public static FareDraft ofSubtotal(BigDecimal subtotal) {
        return new FareDraft(subtotal, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, null);
    }

    public FareDraft withDeliveryFee(BigDecimal d) {
        return new FareDraft(subtotal, d, serviceFee, smallOrderSurcharge, discount, promoCode);
    }

    public FareDraft withServiceFee(BigDecimal s) {
        return new FareDraft(subtotal, deliveryFee, s, smallOrderSurcharge, discount, promoCode);
    }

    public FareDraft withSmallOrderSurcharge(BigDecimal s) {
        return new FareDraft(subtotal, deliveryFee, serviceFee, s, discount, promoCode);
    }

    public FareDraft withDiscount(BigDecimal d) {
        return new FareDraft(subtotal, deliveryFee, serviceFee, smallOrderSurcharge, d, promoCode);
    }

    public FareDraft withPromoCode(String code) {
        return new FareDraft(subtotal, deliveryFee, serviceFee, smallOrderSurcharge, discount, code);
    }

    public Fare toFare() {
        return new Fare(subtotal, deliveryFee, serviceFee, smallOrderSurcharge, discount, promoCode);
    } //Fare computes the total
}