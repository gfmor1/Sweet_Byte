package com.sweetbyte.eats.application.service;

import java.util.Optional;

import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;

public interface CourierService {
    Courier getMe(User user);
    Courier goOnDuty(User user);
    Courier goOffDuty(User user);
    Courier updateLocation(User user, double latitude, double longitude);
    Order confirmPickup(Long orderId, User user);
    Order confirmDelivery(Long orderId, User user);
    Optional<Order> getActiveDelivery(User user);
}