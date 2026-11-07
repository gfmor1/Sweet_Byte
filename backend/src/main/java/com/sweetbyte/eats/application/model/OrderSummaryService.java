package com.sweetbyte.eats.application.model;

import com.sweetbyte.eats.application.model.OrderSummary;

public interface OrderSummaryService {

    OrderSummary getSummary(Long orderId, User user);
    Fare getFare(Long orderId, User user); //follow the charge before delivery
}
