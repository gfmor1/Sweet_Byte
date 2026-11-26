package com.sweetbyte.eats.ui.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.model.CardDetails;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.PlaceOrderCommand;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.service.AuthService;
import com.sweetbyte.eats.application.service.OrderService;
import com.sweetbyte.eats.ui.dto.OrderResponse;
import com.sweetbyte.eats.ui.dto.PlaceOrderRequest;
import com.sweetbyte.eats.ui.dto.RejectOrderRequest;
import com.sweetbyte.eats.ui.dto.UpdateStatusRequest;

@RestController 
@RequestMapping ("/api/orders")
//place, list, view, accept, reject, start preparing, mark ready, cancel
// acting user = the verified Supabase JWT (sub) mapped to our User by AuthService
public class OrderController {
    private final OrderService orderService;
    private final AuthService authService;
    public OrderController(OrderService orderService, AuthService authService) {
        this.orderService = orderService;
        this.authService = authService;
    }

    // POST /api/orders
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(@AuthenticationPrincipal Jwt jwt, @RequestBody PlaceOrderRequest orderRequest) {
        User user = currentUser(jwt);
        PlaceOrderRequest.Card card = orderRequest.payment();
        PlaceOrderCommand command = new PlaceOrderCommand(
                Long.valueOf(orderRequest.restaurantId()),
                orderRequest.toItemQuantities(),
                orderRequest.deliveryAddress(),
                orderRequest.latitude(),
                orderRequest.longitude(),
                card == null ? null
                        : new CardDetails(card.brand(), card.last4(), card.holder(), card.expMonth(), card.expYear()));
        Order order = orderService.placeOrder(command, user);
        return OrderResponse.from(order);
    }

    // GET/api/orders/{id}
    @GetMapping("/{id}")
    public OrderResponse getOrder(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        User user = currentUser(jwt);
        Order order = orderService.getOrder(id, user);
        return OrderResponse.from(order);
    }

    //GET /api/orders/restaurant/{restaurantId}
    @GetMapping("/restaurant/{restaurantId}")
    public List<OrderResponse> getRestaurantOrders(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId) {
        User user = currentUser(jwt);
        List<Order> orders = orderService.getRestaurantOrders(restaurantId, user);
        return orders.stream().map(OrderResponse::from).toList();
    }

    //GET /api/orders/user
    @GetMapping ("/me")
    public List<OrderResponse> getMyOrders(@AuthenticationPrincipal Jwt jwt) {
        return orderService.getUsersOrders(currentUser(jwt)).stream().map(OrderResponse::from).toList();
    }

    // PATCH /api/orders/{id}/status
    // body : { "status": "ACCEPTED" } --> ACCEPTED, PREPARING, READY
    // TODO check if separate routes for each status
    @PatchMapping("/{id}/status")
    public OrderResponse updateOrderStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @RequestBody UpdateStatusRequest newStatus) {
        User user = currentUser(jwt);
        return OrderResponse.from(orderService.updateOrderStatus(id, newStatus.status(), user));
    }

    // POST /api/orders/{id}/reject
    @PostMapping("/{id}/reject")
    public OrderResponse rejectOrder(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @RequestBody RejectOrderRequest reason) {
        User user = currentUser(jwt);
        return OrderResponse.from(orderService.rejectOrder(id, user, reason.reason()));
    }

    //POST /api/orders/{id}/cancel
    @PostMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelOrder(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        User user = currentUser(jwt);
        orderService.cancelOrder(id, user);
    }

    private User currentUser(Jwt jwt) {
        return authService.currentUser(UUID.fromString(jwt.getSubject()));
    }
}
