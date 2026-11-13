package com.sweetbyte.eats.ui.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.service.AuthService;
import com.sweetbyte.eats.application.service.PaymentService;
import com.sweetbyte.eats.ui.dto.PaymentResponse;

@RestController
@RequestMapping("/api/payments")
// Payments tab: customer sees own payments, operator sees all (scoped in PaymentService).
// Refunds go through POST /api/orders/{id}/refund (BillingController) or refund requests.
public class PaymentController {

    private final PaymentService paymentService;
    private final AuthService authService;

    public PaymentController(PaymentService paymentService, AuthService authService) {
        this.paymentService = paymentService;
        this.authService = authService;
    }

    // GET /api/payments
    @GetMapping
    public List<PaymentResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return paymentService.list(authService.currentUser(UUID.fromString(jwt.getSubject())))
                .stream().map(PaymentResponse::from).toList();
    }
}
