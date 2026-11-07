package com.sweetbyte.eats.application.pricing;

import com.sweetbyte.eats.application.model.Order;


public class SubtotalCalculator implements FareCalculator{

    @Override
    public FareDraft calculate(Order order){
        return FareDraft.ofSubtotal(order.getSubtotal()); //Unit price * quantity
    }
}
