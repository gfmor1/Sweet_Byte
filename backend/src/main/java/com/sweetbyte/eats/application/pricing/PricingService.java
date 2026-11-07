package com.sweetbyte.eats.application.pricing;

import com.sweetbyte.eats.application.model.BillingRecord;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Fare;
import com.sweetbyte.eats.application.model.PricingConfig;


public interface PricingService {

    Fare computeFare(Order order);  //UC I
    BillingRecord recordFare(Order order);
    Fare getFare(Long orderId);
    PricingConfig getConfig();
}
