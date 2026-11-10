package com.sweetbyte.eats.ui.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.service.AuthService;
import com.sweetbyte.eats.application.service.CourierService;
import com.sweetbyte.eats.application.service.DispatchService;
import com.sweetbyte.eats.ui.dto.CourierResponse;
import com.sweetbyte.eats.ui.dto.OrderResponse;

// DLV, operator side: see what waits for a courier, and reassign (R-DLV-02, R-DLV-04).
@RestController
@RequestMapping("/api/dispatch")
public class DispatchController {

    private final DispatchService dispatchService;
    private final CourierService courierService;
    private final AuthService authService;

    public DispatchController(DispatchService dispatchService, CourierService courierService,
                              AuthService authService) {
        this.dispatchService = dispatchService;
        this.courierService = courierService;
        this.authService = authService;
    }

    // GET /api/dispatch/couriers   every role sees couriers on the map (R-DASH-02)
    @GetMapping("/couriers")
    public List<CourierResponse> couriers() {
        return courierService.listCouriers().stream().map(CourierResponse::from).toList();
    }

    // GET /api/dispatch/queue
    @GetMapping("/queue")
    public List<OrderResponse> queue(@AuthenticationPrincipal Jwt jwt) {
        return dispatchService.getQueue(currentUser(jwt)).stream().map(OrderResponse::from).toList();
    }

    // GET /api/dispatch/stalled
    @GetMapping("/stalled")
    public List<OrderResponse> stalled(@AuthenticationPrincipal Jwt jwt) {
        return dispatchService.getStalledOrders(currentUser(jwt)).stream().map(OrderResponse::from).toList();
    }

    // POST /api/dispatch/orders/{orderId}/reassign
    @PostMapping("/orders/{orderId}/reassign")
    public OrderResponse reassign(@PathVariable Long orderId, @AuthenticationPrincipal Jwt jwt) {
        return OrderResponse.from(dispatchService.reassign(orderId, currentUser(jwt)));
    }

    private User currentUser(Jwt jwt) {
        return authService.currentUser(UUID.fromString(jwt.getSubject()));
    }
}