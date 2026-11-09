package com.sweetbyte.eats.ui.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.service.AuthService;
import com.sweetbyte.eats.application.service.DeliveryService;
import com.sweetbyte.eats.ui.dto.CourierOfferResponse;
import com.sweetbyte.eats.ui.dto.CourierResponse;
import com.sweetbyte.eats.ui.dto.OperatorDashboardResponse;
import com.sweetbyte.eats.ui.dto.WaitingOrderResponse;

@RestController
@RequestMapping("/api")
// DLV endpoints: courier commands, dispatch views, operator reassign
public class DeliveryController {
    private final DeliveryService deliveryService;
    private final AuthService authService;

    public DeliveryController(DeliveryService deliveryService, AuthService authService) {
        this.deliveryService = deliveryService;
        this.authService = authService;
    }

    @GetMapping("/courier/me")
    public CourierResponse me(@AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(deliveryService.getCourier(currentUser(jwt)));
    }

    @PostMapping("/courier/duty/on")
    public CourierResponse goOnDuty(@AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(deliveryService.goOnDuty(currentUser(jwt)));
    }

    @PostMapping("/courier/duty/off")
    public CourierResponse goOffDuty(@AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(deliveryService.goOffDuty(currentUser(jwt)));
    }

    // 204 when the courier has no current order
    @GetMapping("/courier/offer")
    public ResponseEntity<CourierOfferResponse> offer(@AuthenticationPrincipal Jwt jwt) {
        return deliveryService.currentDelivery(currentUser(jwt))
                .map(delivery -> ResponseEntity.ok(CourierOfferResponse.from(delivery)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/courier/offer/accept")
    public CourierResponse acceptOffer(@AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(deliveryService.acceptOffer(currentUser(jwt)));
    }

    @PostMapping("/courier/offer/decline")
    public CourierResponse declineOffer(@AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(deliveryService.declineOffer(currentUser(jwt)));
    }

    @PostMapping("/courier/pickup")
    public CourierResponse confirmPickup(@AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(deliveryService.confirmPickup(currentUser(jwt)));
    }

    @PostMapping("/courier/delivery")
    public CourierResponse confirmDelivery(@AuthenticationPrincipal Jwt jwt) {
        return CourierResponse.from(deliveryService.confirmDelivery(currentUser(jwt)));
    }

    // Every role sees on-duty couriers on the map (R-DASH-02)
    @GetMapping("/dispatch/couriers")
    public List<CourierResponse> couriers() {
        return deliveryService.listCouriers().stream().map(CourierResponse::from).toList();
    }

    @GetMapping("/dispatch/queue")
    public List<WaitingOrderResponse> queue(@AuthenticationPrincipal Jwt jwt) {
        return deliveryService.dispatchQueue(currentUser(jwt)).stream().map(WaitingOrderResponse::from).toList();
    }

    @GetMapping("/operator/dashboard")
    public OperatorDashboardResponse dashboard(@AuthenticationPrincipal Jwt jwt) {
        return OperatorDashboardResponse.from(deliveryService.operatorOverview(currentUser(jwt)));
    }

    @PostMapping("/operator/orders/{id}/reassign")
    public OperatorDashboardResponse.OrderRow reassign(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return OperatorDashboardResponse.OrderRow.from(deliveryService.reassign(id, currentUser(jwt)));
    }

    private User currentUser(Jwt jwt) {
        return authService.currentUser(UUID.fromString(jwt.getSubject()));
    }
}
