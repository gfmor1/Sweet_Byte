package com.sweetbyte.eats.ui.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.service.PricingService;
import com.sweetbyte.eats.ui.dto.PricingConfigResponse;

@RestController
@RequestMapping("/api/pricing")
// exposes the fare rules loaded from application.properties (R-PRC-01)
public class PricingController {

    private final PricingService pricingService;

    public PricingController(PricingService pricingService) {
        this.pricingService = pricingService;
    }

    // GET /api/pricing/config
    @GetMapping("/config")
    public PricingConfigResponse getConfig() {
        return PricingConfigResponse.from(pricingService.getConfig());
    }
}