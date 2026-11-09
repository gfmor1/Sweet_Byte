package com.sweetbyte.eats.ui.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.service.AuthService;
import com.sweetbyte.eats.application.service.CourierService;
import com.sweetbyte.eats.application.service.DispatchService;
import com.sweetbyte.eats.ui.dto.CourierResponse;
import com.sweetbyte.eats.ui.dto.DeliveryOfferResponse;
import com.sweetbyte.eats.ui.dto.LocationRequest;
import com.sweetbyte.eats.ui.dto.OrderResponse;

// DLV: everything the connected courier does. No business logic here.
@RestController
@RequestMapping("/api/couriers/me")
public class CourierController {

    private final CourierService courierService;
    private final DispatchService dispatchService;
    private final AuthService authService;

    public CourierController(CourierService courierService,
                             DispatchService dispatchService,
                             AuthService authService) {
        this.courierService = courierService;
        this.dispatchService = dispatchService;
        this.authService = authService;
    }

    // GET /api/couriers/me
    @GetMapping
    public CourierResponse me(@AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(courierService.getMe(currentUser(jwt)));
    }

    // POST /api/couriers/me/on-duty
    @PostMapping("/on-duty")
    public CourierResponse goOnDuty(@AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(courierService.goOnDuty(currentUser(jwt)));
    }

    // POST /api/couriers/me/off-duty
    @PostMapping("/off-duty")
    public CourierResponse goOffDuty(@AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(courierService.goOffDuty(currentUser(jwt)));
    }

    // PATCH /api/couriers/me/location   body: { "latitude": 45.50, "longitude": -73.57 }
    @PatchMapping("/location")
    public CourierResponse updateLocation(@RequestBody LocationRequest request,
                                          @AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(courierService.updateLocation(
                currentUser(jwt), request.latitude(), request.longitude()));
    }

    // GET /api/couriers/me/offer   -> 200 with the offer, or 204 if none
    @GetMapping("/offer")
    public ResponseEntity<DeliveryOfferResponse> currentOffer(@AuthenticationPrincipal Jwt jwt) {
        return dispatchService.getCurrentOffer(currentUser(jwt))
                .map(offer -> ResponseEntity.ok(DeliveryOfferResponse.from(offer)))
                .orElse(ResponseEntity.noContent().build());
    }

    // POST /api/couriers/me/orders/{orderId}/accept
    @PostMapping("/orders/{orderId}/accept")
    public OrderResponse accept(@PathVariable Long orderId, @AuthenticationPrincipal Jwt jwt) {
        return OrderResponse.from(dispatchService.acceptOffer(orderId, currentUser(jwt)));
    }

    // POST /api/couriers/me/orders/{orderId}/decline   -> 204
    @PostMapping("/orders/{orderId}/decline")
    public ResponseEntity<Void> decline(@PathVariable Long orderId, @AuthenticationPrincipal Jwt jwt) {
        dispatchService.declineOffer(orderId, currentUser(jwt));
        return ResponseEntity.noContent().build();
    }

    // POST /api/couriers/me/orders/{orderId}/pickup
    @PostMapping("/orders/{orderId}/pickup")
    public OrderResponse pickup(@PathVariable Long orderId, @AuthenticationPrincipal Jwt jwt) {
        return OrderResponse.from(courierService.confirmPickup(orderId, currentUser(jwt)));
    }

    // POST /api/couriers/me/orders/{orderId}/deliver
    @PostMapping("/orders/{orderId}/deliver")
    public OrderResponse deliver(@PathVariable Long orderId, @AuthenticationPrincipal Jwt jwt) {
        return OrderResponse.from(courierService.confirmDelivery(orderId, currentUser(jwt)));
    }

    // GET /api/couriers/me/delivery   -> the order the courier holds, or 204
    @GetMapping("/delivery")
    public ResponseEntity<OrderResponse> activeDelivery(@AuthenticationPrincipal Jwt jwt) {
        return courierService.getActiveDelivery(currentUser(jwt))
                .map(order -> ResponseEntity.ok(OrderResponse.from(order)))
                .orElse(ResponseEntity.noContent().build());
    }

    private User currentUser(Jwt jwt) {
        return authService.currentUser(UUID.fromString(jwt.getSubject()));
    }
}