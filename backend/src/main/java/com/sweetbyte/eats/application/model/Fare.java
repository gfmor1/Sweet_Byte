package com.sweetbyte.eats.application.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Itemized price of one order (R-PRC-01). Immutable value object:
 * once computed at checkout it never changes. Stored inside BillingRecord.
 */
@Embeddable
public class Fare {

    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal deliveryFee;

    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal serviceFee;

    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal smallOrderSurcharge;

    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal discount;

    // Always subtotal + fees + surcharge; stored so the ledger/history can read it directly.
    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal total;

    // Required by JPA. Not for our code.
    protected Fare() {
    }

    public Fare(BigDecimal subtotal, BigDecimal deliveryFee,
                BigDecimal serviceFee, BigDecimal smallOrderSurcharge) {
        this(subtotal, deliveryFee, serviceFee, smallOrderSurcharge, BigDecimal.ZERO);
    }

    public Fare(BigDecimal subtotal, BigDecimal deliveryFee,
                BigDecimal serviceFee, BigDecimal smallOrderSurcharge, BigDecimal discount) {
        this.subtotal = money(subtotal, "subtotal");
        this.deliveryFee = money(deliveryFee, "deliveryFee");
        this.serviceFee = money(serviceFee, "serviceFee");
        this.smallOrderSurcharge = money(smallOrderSurcharge, "smallOrderSurcharge");
        this.discount = money(discount, "discount");
        BigDecimal beforeDiscount = this.subtotal.add(this.deliveryFee)
                .add(this.serviceFee)
                .add(this.smallOrderSurcharge);
        this.total = beforeDiscount.subtract(this.discount).max(BigDecimal.ZERO);
    }

    private static BigDecimal money(BigDecimal value, String name) {
        Objects.requireNonNull(value, name + " must not be null");
        if (value.signum() < 0) {
            throw new IllegalArgumentException(name + " must not be negative");
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public BigDecimal getDeliveryFee() {
        return deliveryFee;
    }

    public BigDecimal getServiceFee() {
        return serviceFee;
    }

    public BigDecimal getSmallOrderSurcharge() {
        return smallOrderSurcharge;
    }

    public BigDecimal getDiscount() {
        return discount;
    }

    public BigDecimal getTotal() {
        return total;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Fare f)) return false;
        return subtotal.equals(f.subtotal) && deliveryFee.equals(f.deliveryFee)
                && serviceFee.equals(f.serviceFee)
                && smallOrderSurcharge.equals(f.smallOrderSurcharge);
    }

    @Override
    public int hashCode() {
        return Objects.hash(subtotal, deliveryFee, serviceFee, smallOrderSurcharge);
    }

    @Override
    public String toString() {
        return "Fare{subtotal=" + subtotal + ", deliveryFee=" + deliveryFee
                + ", serviceFee=" + serviceFee + ", surcharge=" + smallOrderSurcharge
                + ", total=" + total + "}";
    }
}