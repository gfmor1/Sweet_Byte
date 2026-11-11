package com.sweetbyte.eats.application.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * The fare saved for one order when it is placed (UC-PRC-01).
 * This is the amount the customer paid; it is never recomputed.
 * One row per order: the order id is the primary key.
 *
 * The fare itself is never updated. The only later change is the (mock) refund:
 * markRefunded() writes the refund fields once (full fare), so billing shows the money
 * went back to the customer. No real payment provider is called.
 */
@Entity
@Table(name = "billing_records")
public class BillingRecord {

    @Id
    @Column(nullable = false, updatable = false)
    private Long orderId;

    @Embedded
    private Fare fare;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    // ---- mock refund (Automatic Credit Refund), all null until refunded ----
    @Column(precision = 10, scale = 2)
    private BigDecimal refundedAmount;

    private Instant refundedAt;

    // Stands in for the payment provider's refund transaction id.
    private UUID refundReference;

    // Required by JPA. Not for our code.
    protected BillingRecord() { }

    public BillingRecord(Long orderId, Fare fare) {
        this.orderId = Objects.requireNonNull(orderId, "orderId");
        this.fare = Objects.requireNonNull(fare, "fare");
        this.createdAt = Instant.now();
    }

    // Mock "return the payment": full refund only, the whole fare goes back to the customer.
    // At most once per order.
    public void markRefunded() {
        if (isRefunded()) {
            throw new IllegalStateException("Order " + orderId + " was already refunded");
        }
        this.refundedAmount = fare.getTotal().setScale(2, RoundingMode.HALF_UP);
        this.refundedAt = Instant.now();
        this.refundReference = UUID.randomUUID();
    }

    public boolean isRefunded() { return refundedAt != null; }

    public Long getOrderId() { return orderId; }
    public Fare getFare() { return fare; }
    public Instant getCreatedAt() { return createdAt; }
    public BigDecimal getRefundedAmount() { return refundedAmount; }
    public Instant getRefundedAt() { return refundedAt; }
    public UUID getRefundReference() { return refundReference; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BillingRecord other)) return false;
        return orderId.equals(other.orderId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(orderId);
    }
}
