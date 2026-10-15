package com.sweetbyte.eats.application.service;

import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.OrderRepository;

@Service 
public class OrderServiceImpl implements OrderService {
    /* OrderRepo instance */
    private final OrderRepository orderRepository;
    public OrderServiceImpl(OrderRepository orderRepository) {
        this.orderRepository = orderRepository; /* init order repo*/
    }

    @Override
    public Order createOrder(Order order, User user) {
        // Implementation for creating an order
        Objects.requireNonNull(order, "Order cannot be null");
        Objects.requireNonNull(user, "User cannot be null");

        if (order.getCustomer() == null || !order.getCustomer().equals(user))
            throw new IllegalArgumentException("Order must belong to the user");
        if (order.getOrderId() != null)
            throw new IllegalArgumentException("This order already exists");
        return orderRepository.save(order);
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
    public Order updateOrderStatus(Order order, OrderStatus newStatus, User user) {
        if (newStatus == OrderStatus.ACCEPTED) 
                order.accept();
        if (newStatus == OrderStatus.PREPARING) 
                order.startPreparing();
        if (newStatus == OrderStatus.CANCELLED)
                cancelOrder(order.getOrderId(), user);
        return orderRepository.save(order);
    }

    @Override
    public void cancelOrder(Long orderId, User user) {
        // Implementation for canceling an order
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        if (user.getRole().equals("CUSTOMER")) {
            order.cancelByCustomer();
        } else if (user.getRole().equals("OPERATOR")) {
            order.cancelByOperator();
        }
        orderRepository.delete(order);
    }
}
