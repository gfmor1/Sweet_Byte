package com.sweetbyte.eats.application.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;

@Service 
public interface OrderService {
    Order createOrder(Long restaurantId, Map<Long, Integer> itemQuantities, User user);
    Order getOrder(Long orderId, User user);
    Order rejectOrder(Long orderId, User user, String reason);
    List<Order> getUsersOrders(User user);
    List<Order> getRestaurantOrders(Long restaurantId, User user);
    Order updateOrderStatus(Order order, OrderStatus newStatus, User user);
    void cancelOrder(Long orderId, User user);
}