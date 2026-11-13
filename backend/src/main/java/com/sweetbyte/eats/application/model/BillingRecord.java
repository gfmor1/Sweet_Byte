package com.sweetbyte.eats.application.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import com.sweetbyte.eats.application.enums.BillingRecordType;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * One money movement for an order (mock: no real payment provider is called).
 * Append-only: rows are inserted and read, never updated.
 *
 * PAYMENT: written when the order is placed (UC-PRC-01). amount = +fare total.
 * REFUND:  written by the Automatic Credit Refund. amount = -(fare total), full refund only.
 *
 * An order has at most one PAYMENT and at most one REFUND (unique order_id + type),
 * so a refunded order appears twice. Both rows carry the fare breakdown that was charged.
 */
@Entity
@Table(name = "billing_records",
        uniqueConstraints = @UniqueConstraint(columnNames = {"order_id", "type"}),
        indexes = @Index(columnList = "order_id"))
public class BillingRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false, updatable = false)
    private Long orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 10)
    private BillingRecordType type;

    // The fare that was charged (copied onto the refund row: full refund of the same fare).
    @Embedded
    private Fare fare;

    // Signed: +total for PAYMENT, -total for REFUND, so SUM(amount) per order = what the customer is out.
    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    // Stands in for the payment provider's transaction id.
    @Column(nullable = false, updatable = false)
    private UUID reference;

    @Column(updatable = false)          // REFUND only, optional
    private String reason;

    // Required by JPA. Not for our code.
    protected BillingRecord() { }

    private BillingRecord(Long orderId, BillingRecordType type, Fare fare, BigDecimal amount, String reason) {
        this.orderId = Objects.requireNonNull(orderId, "orderId");
        this.type = Objects.requireNonNull(type, "type");
        this.fare = Objects.requireNonNull(fare, "fare");
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
        this.createdAt = Instant.now();
        this.reference = UUID.randomUUID();
        this.reason = (reason == null || reason.isBlank()) ? null : reason.trim();
    }

    // The customer pays the fare at placement.
    public static BillingRecord payment(Long orderId, Fare fare) {
        Objects.requireNonNull(fare, "fare");
        return new BillingRecord(orderId, BillingRecordType.PAYMENT, fare, fare.getTotal(), null);
    }

    // Mock "return the payment": full refund of a recorded PAYMENT.
    public static BillingRecord refundOf(BillingRecord payment, String reason) {
        Objects.requireNonNull(payment, "payment");
        if (payment.type != BillingRecordType.PAYMENT) {
            throw new IllegalArgumentException("A refund must reverse a PAYMENT record");
        }
        return new BillingRecord(payment.orderId, BillingRecordType.REFUND, payment.fare,
                payment.amount.negate(), reason);
    }

    public Long getId() { return id; }
    public Long getOrderId() { return orderId; }
    public BillingRecordType getType() { return type; }
    public Fare getFare() { return fare; }
    public BigDecimal getAmount() { return amount; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getReference() { return reference; }
    public String getReason() { return reason; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BillingRecord other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
