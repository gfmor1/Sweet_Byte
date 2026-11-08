package com.sweetbyte.eats.application.model;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * The four pricing values read from the configuration file.
 * Never hard-code these values (Phase III pricing rules).
 */
public final class PricingConfig {

    private final BigDecimal deliveryFee;
    private final BigDecimal serviceFee;
    private final BigDecimal smallOrderThreshold;
    private final BigDecimal smallOrderSurcharge;

    public PricingConfig(BigDecimal deliveryFee, BigDecimal serviceFee,
                         BigDecimal smallOrderThreshold, BigDecimal smallOrderSurcharge) {
        this.deliveryFee = nonNegative(deliveryFee, "deliveryFee");
        this.serviceFee = nonNegative(serviceFee, "serviceFee");
        this.smallOrderThreshold = nonNegative(smallOrderThreshold, "smallOrderThreshold");
        this.smallOrderSurcharge = nonNegative(smallOrderSurcharge, "smallOrderSurcharge");
    }

    private static BigDecimal nonNegative(BigDecimal value, String name) {
        Objects.requireNonNull(value, "Missing pricing value: " + name);
        if (value.signum() < 0) {
            throw new IllegalArgumentException("Pricing value must not be negative: " + name);
        }
        return value;
    }

    public BigDecimal getDeliveryFee() { return deliveryFee; }
    public BigDecimal getServiceFee() { return serviceFee; }
    public BigDecimal getSmallOrderThreshold() { return smallOrderThreshold; }
    public BigDecimal getSmallOrderSurcharge() { return smallOrderSurcharge; }
}