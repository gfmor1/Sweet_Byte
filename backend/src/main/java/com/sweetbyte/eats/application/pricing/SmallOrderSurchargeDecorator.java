package com.sweetbyte.eats.application.pricing;

import java.math.BigDecimal;
import com.sweetbyte.eats.application.model.Order;

public class SmallOrderSurchargeDecorator extends FareCalculatorDecorator{

    private BigDecimal threshold;
    private BigDecimal surcharge;

    public SmallOrderSurchargeDecorator(FareCalculator inner, BigDecimal threshold, BigDecimal surcharge){
        super(inner);
        this.surcharge = surcharge;
        this.threshold = threshold;

    }

    @Override
    public FareDraft calculate(Order order) {
        FareDraft draft = inner.calculate(order);
        //check if the price is below the small order rule
        boolean small = draft.subtotal().compareTo(threshold) < 0; // < 0 because strictly below small order rule
        return draft.withSmallOrderSurcharge(small ? surcharge : BigDecimal.ZERO);
    }
}
