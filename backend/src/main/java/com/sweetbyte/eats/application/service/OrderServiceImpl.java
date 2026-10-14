package com.sweetbyte.eats.application.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;

@Service 
public class OrderServiceImpl implements OrderService {
    @Override
    public Order createOrder(Order order, User user) {
        // Implementation for creating an order


        return null;
    }

    @Override
    public void cancelOrder(Long orderId, User user) throws Exception {
        // Implementation for canceling an order
    }

    @Override
    public List<Order> getUsersOrders(User user) {
        // Implementation for getting a user's orders
        return null;
    }

    @Override
    public List<Order> getRestaurantOrders(Long restaurantId, User user) {
        // Implementation for getting a restaurant's orders
        return null;
    }

    @Override
    public Order getOrder(Long orderId, User user) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'getOrder'");
    }

    @Override
    public List<Order> getRestaurantOrdersByStatus(Long restaurantId, OrderStatus status, User user) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'getRestaurantOrdersByStatus'");
    }

    @Override
    public Order updateOrderStatus(Long orderId, OrderStatus newStatus, User user) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'updateOrderStatus'");
    }
}
