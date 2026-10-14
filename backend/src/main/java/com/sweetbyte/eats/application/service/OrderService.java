package com.sweetbyte.eats.application.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;

@Service 
public interface OrderService {
    Order createOrder(Order order, User user);
    Order getOrder(Long orderId, User user);
    List<Order> getUsersOrders(User user);
    List<Order> getRestaurantOrders(Long restaurantId, User user);
    List<Order> getRestaurantOrdersByStatus(Long restaurantId, OrderStatus status, User user);
    Order updateOrderStatus(Long orderId, OrderStatus newStatus, User user);
    void cancelOrder(Long orderId, User user) throws Exception;
}