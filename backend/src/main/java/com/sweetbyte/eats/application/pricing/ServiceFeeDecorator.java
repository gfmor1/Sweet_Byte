package com.sweetbyte.eats.application.pricing;

import com.sweetbyte.eats.application.model.Order;
import java.math.BigDecimal;
import java.security.Provider;

public class ServiceFeeDecorator extends FareCalculatorDecorator{

    private BigDecimal serviceFee;

    public ServiceFeeDecorator(FareCalculator inner, BigDecimal serviceFee){
        super(inner);
        this.serviceFee = serviceFee;
    }

    @Override
    public FareDraft calculate(Order order){
        return inner.calculate(order).withServiceFee(serviceFee);
    }

}
