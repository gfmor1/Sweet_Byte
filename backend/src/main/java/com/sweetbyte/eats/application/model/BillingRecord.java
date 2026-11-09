package com.sweetbyte.eats.application.model;

import java.time.Instant;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * The fare saved for one order when it is placed (UC-PRC-01).
 * This is the amount the customer paid; it is never recomputed.
 * One row per order: the order id is the primary key. Never updated.
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

    // Required by JPA. Not for our code.
    protected BillingRecord() { }

    public BillingRecord(Long orderId, Fare fare) {
        this.orderId = Objects.requireNonNull(orderId, "orderId");
        this.fare = Objects.requireNonNull(fare, "fare");
        this.createdAt = Instant.now();
    }

    public Long getOrderId() { return orderId; }
    public Fare getFare() { return fare; }
    public Instant getCreatedAt() { return createdAt; }

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
