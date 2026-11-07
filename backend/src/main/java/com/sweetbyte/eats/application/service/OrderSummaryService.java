package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.model.Fare;
import com.sweetbyte.eats.application.model.OrderSummary;
import com.sweetbyte.eats.application.model.User;

public interface OrderSummaryService {

    OrderSummary getSummary(Long orderId, User user);
    Fare getFare(Long orderId, User user); //follow the charge before delivery
}
