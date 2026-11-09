package com.sweetbyte.eats.application.service;

import java.util.List;
import java.util.Optional;

import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.DeliveryOffer;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;

// DLV: offers READY orders to couriers with the fixed rule, and keeps the dispatch queue.
public interface DispatchService {

    void onOrderReady(Order order, User actor);

    void retryQueue(User actor);

    Optional<DeliveryOffer> getCurrentOffer(User user);
    Order acceptOffer(Long orderId, User user);
    void declineOffer(Long orderId, User user);
    void withdrawPendingOffer(Courier courier, User actor);

    List<Order> getQueue(User user);
    List<Order> getStalledOrders(User user);
    Order reassign(Long orderId, User user);
}