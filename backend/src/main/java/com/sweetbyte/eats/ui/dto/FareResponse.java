package com.sweetbyte.eats.ui.dto;

import java.math.BigDecimal;
import com.sweetbyte.eats.application.model.Fare;

public record FareResponse (BigDecimal subtotal, BigDecimal deliveryFee, BigDecimal serviceFee, BigDecimal smallOrderSurcharge, BigDecimal discount, String promoCode, BigDecimal total) {

    public static FareResponse from(Fare fare) {
        return new FareResponse(fare.getSubtotal(), fare.getDeliveryFee(), fare.getServiceFee(), fare.getSmallOrderSurcharge(), fare.getDiscount(), fare.getPromoCode(), fare.getTotal());
    }

}
