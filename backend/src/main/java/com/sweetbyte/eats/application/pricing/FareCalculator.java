package com.sweetbyte.eats.application.pricing;

import com.sweetbyte.eats.application.model.Order;
//Decorator interface component
public interface FareCalculator {

    FareDraft calculate(Order order);
}
