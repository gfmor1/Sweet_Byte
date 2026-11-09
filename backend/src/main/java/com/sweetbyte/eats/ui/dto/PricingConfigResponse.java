package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.model.PricingConfig;

import java.math.BigDecimal;

public record PricingConfigResponse(BigDecimal deliveryFee, BigDecimal serviceFee, BigDecimal smallOrderThreshold, BigDecimal smallOrderSurcharge){
    public static PricingConfigResponse from(PricingConfig config){
        return new PricingConfigResponse(config.getDeliveryFee(),config.getServiceFee(),config.getSmallOrderThreshold(),config.getSmallOrderSurcharge());
    }

}


