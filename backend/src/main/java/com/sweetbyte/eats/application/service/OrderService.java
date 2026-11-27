package com.sweetbyte.eats.application.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.PlaceOrderCommand;
import com.sweetbyte.eats.application.model.User;

@Service 
public interface OrderService {
    // Delivery address + coordinates are chosen at checkout and saved on the order (not the customer).
    // The (mock) card is charged the fare total; a BillingRecord is created in the same transaction.
    Order placeOrder(PlaceOrderCommand command, User user);
    Order getOrder(Long orderId, User user);
    Order rejectOrder(Long orderId, User user, String reason);
    List<Order> getUsersOrders(User user);
    List<Order> getRestaurantOrders(Long restaurantId, User user);
    Order updateOrderStatus(Long orderId, OrderStatus newStatus, User user);
    void cancelOrder(Long orderId, User user);
}