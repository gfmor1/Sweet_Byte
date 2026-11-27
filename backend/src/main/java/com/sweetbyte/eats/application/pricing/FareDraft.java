package com.sweetbyte.eats.application.pricing;

import com.sweetbyte.eats.application.model.Fare;

import java.math.BigDecimal;


//Fare being built one component (fare elements) at a time by decorator chain
public record FareDraft(BigDecimal subtotal, BigDecimal deliveryFee, BigDecimal serviceFee,
                        BigDecimal smallOrderSurcharge, BigDecimal discount) {

    public static FareDraft ofSubtotal(BigDecimal subtotal) {
        return new FareDraft(subtotal, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    public FareDraft withDeliveryFee(BigDecimal d) {
        return new FareDraft(subtotal, d, serviceFee, smallOrderSurcharge, discount);
    }

    public FareDraft withServiceFee(BigDecimal s) {
        return new FareDraft(subtotal, deliveryFee, s, smallOrderSurcharge, discount);
    }

    public FareDraft withSmallOrderSurcharge(BigDecimal s) {
        return new FareDraft(subtotal, deliveryFee, serviceFee, s, discount);
    }

    public FareDraft withDiscount(BigDecimal d) {
        return new FareDraft(subtotal, deliveryFee, serviceFee, smallOrderSurcharge, d);
    }

    public Fare toFare() {
        return new Fare(subtotal, deliveryFee, serviceFee, smallOrderSurcharge, discount);
    } //Fare computes the total
}