package com.sweetbyte.eats.ui.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.service.PromoService;
import com.sweetbyte.eats.ui.dto.PromoValidateRequest;
import com.sweetbyte.eats.ui.dto.PromoValidateResponse;

@RestController
@RequestMapping("/api/promo")
// Instant feedback for the Apply button. Placement re-validates the code (R-PROMO-01).
public class PromoController {

    private final PromoService promoService;

    public PromoController(PromoService promoService) {
        this.promoService = promoService;
    }

    // POST /api/promo/validate -> 200 {code, discount}, or 422 {message} when refused
    @PostMapping("/validate")
    public PromoValidateResponse validate(@RequestBody PromoValidateRequest request) {
        if (request.code() == null || request.code().isBlank())
            throw new IllegalArgumentException("Enter a promo code.");
        if (request.subtotal() == null || request.subtotal().signum() < 0)
            throw new IllegalArgumentException("Subtotal is required");
        return new PromoValidateResponse(request.code().trim().toUpperCase(),
                promoService.validate(request.code(), request.subtotal()));
    }
}
