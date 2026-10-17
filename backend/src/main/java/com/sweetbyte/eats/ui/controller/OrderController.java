package com.sweetbyte.eats.ui.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.service.OrderService;
import com.sweetbyte.eats.repository.persistence.UserRepository;
import com.sweetbyte.eats.ui.dto.OrderResponse;
import com.sweetbyte.eats.ui.dto.PlaceOrderRequest;
import com.sweetbyte.eats.ui.dto.RejectOrderRequest;
import com.sweetbyte.eats.ui.dto.UpdateStatusRequest;

@RestController 
@RequestMapping ("/api/orders")
//place, list, view, accept, reject, start preparing, mark ready, cancel
//TODO added user manually for now => to replace
public class OrderController {
    private final OrderService orderService;
    private final UserRepository userRepository;
    public OrderController(OrderService orderService, UserRepository userRepository) {
        this.orderService = orderService;
        this.userRepository = userRepository;
    }

    // POST /api/orders
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(@RequestBody PlaceOrderRequest orderRequest) {
        User user = userRepository.findById(1L)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Order order = orderService.placeOrder(Long.valueOf(orderRequest.restaurantId()), orderRequest.toItemQuantities(), user);
        return OrderResponse.from(order);
    }

    // GET/api/orders/{id}
    @GetMapping("/{id}")
    public OrderResponse getOrder(@PathVariable Long id) {
        User user = userRepository.findById(1L)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Order order = orderService.getOrder(id, user);
        return OrderResponse.from(order);
    }

    //GET /api/orders/restaurant/{restaurantId}
    @GetMapping("/restaurant/{restaurantId}")
    public List<OrderResponse> getRestaurantOrders(@PathVariable Long restaurantId) {
        User user = userRepository.findById(1L)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        List<Order> orders = orderService.getRestaurantOrders(restaurantId, user);
        return orders.stream().map(OrderResponse::from).toList();
    }

    //GET /api/orders/user
    @GetMapping ("/me")
    public List<OrderResponse> getMyOrders() {
        return userRepository.findById(1L)
            .map(user -> orderService.getUsersOrders(user).stream().map(OrderResponse::from).toList())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    // PATCH /api/orders/{id}/status
    // body : { "status": "ACCEPTED" } --> ACCEPTED, PREPARING, READY
    // TODO check if separate routes for each status
    @PatchMapping("/{id}/status")
    public OrderResponse updateOrderStatus(@PathVariable Long id, @RequestBody UpdateStatusRequest newStatus) {
        User user = userRepository.findById(1L)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Order order = orderService.getOrder(id, user);
        return OrderResponse.from(orderService.updateOrderStatus(order, newStatus.status(), user));
    }

    // POST /api/orders/{id}/reject
    @PostMapping("/{id}/reject")
    public OrderResponse rejectOrder(@PathVariable Long id, @RequestBody RejectOrderRequest reason) {
        User user = userRepository.findById(1L)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return OrderResponse.from(orderService.rejectOrder(id, user, reason.reason()));
    }

    //POST /api/orders/{id}/cancel
    @PostMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelOrder(@PathVariable Long id) {
        User user = userRepository.findById(1L)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        orderService.cancelOrder(id, user);
    }
}
