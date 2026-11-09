package com.sweetbyte.eats.application.pricing;

import java.math.BigDecimal;
import com.sweetbyte.eats.application.model.Order;

public class DeliveryFeeDecorator extends FareCalculatorDecorator{

    private final BigDecimal deliveryFee;

    public DeliveryFeeDecorator(FareCalculator inner, BigDecimal deliveryFee){
        super(inner);
        this.deliveryFee = deliveryFee;
    }

    @Override
    public FareDraft calculate(Order order){
        return inner.calculate(order).withDeliveryFee(deliveryFee);
    }
}
