package com.sweetbyte.eats.application.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

// Promo code read from the configuration file (R-PROMO-02 rules live here).
public class PromoCode {

    private final String code;
    private final BigDecimal discount;
    private final LocalDate expiresOn;
    private final BigDecimal minimumOrderValue;

    public PromoCode(String code, BigDecimal discount, LocalDate expiresOn, BigDecimal minimumOrderValue) {
        this.code = Objects.requireNonNull(code, "code is required").trim().toUpperCase();
        this.discount = Objects.requireNonNull(discount, "discount is required");
        this.expiresOn = Objects.requireNonNull(expiresOn, "expiresOn is required");
        this.minimumOrderValue = Objects.requireNonNull(minimumOrderValue, "minimumOrderValue is required");
    }

    // Valid on the expiry day itself, refused from the day after.
    public boolean isExpiredOn(LocalDate today) {
        return today.isAfter(expiresOn);
    }

    public boolean meetsMinimum(BigDecimal subtotal) {
        return subtotal.compareTo(minimumOrderValue) >= 0;
    }

    public String getCode()                   { return code; }
    public BigDecimal getDiscount()           { return discount; }
    public LocalDate getExpiresOn()           { return expiresOn; }
    public BigDecimal getMinimumOrderValue()  { return minimumOrderValue; }
}