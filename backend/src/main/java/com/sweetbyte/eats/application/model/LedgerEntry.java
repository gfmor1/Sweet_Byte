package com.sweetbyte.eats.application.model;

import com.sweetbyte.eats.application.enums.LedgerEntryType;
import com.sweetbyte.eats.application.enums.OrderStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.MapKeyEnumerated;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * One line of the ledger (R-PRC-03). The ledger is the ledger_entries table:
 * append-only, rows are inserted and read, never updated or deleted (except by Reset).
 *
 * CHARGE: written when an order reaches a final state (UC-PRC-02), amount >= 0.
 * REFUND: written by the operator refund (UC-PRC-05), amount = -(charge amount).
 * Built only through charge(...) and refund(...), so these rules always hold.
 * The database adds two more: one CHARGE and one REFUND per order (unique
 * order_id + type), and a refund must point at an existing charge (foreign key).
 */
@Entity
@Table(name = "ledger_entries",
        uniqueConstraints = @UniqueConstraint(columnNames = {"order_id", "type"}),
        indexes = {
                @Index(columnList = "customer_id"),
                @Index(columnList = "restaurant_id"),
                @Index(columnList = "courier_id")
        })
public class LedgerEntry {

    // States in which an order is finished and can be charged.
    private static final Set<OrderStatus> CHARGEABLE = EnumSet.of(
            OrderStatus.DELIVERED, OrderStatus.REJECTED, OrderStatus.CANCELLED);

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 10)
    private LedgerEntryType type;

    // Plain ids, not entity links: the ledger is a record of what happened,
    // and these ids are what role-scoped history filters on (R-PRC-04).
    @Column(name = "order_id", nullable = false, updatable = false)
    private Long orderId;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private Long customerId;

    @Column(name = "restaurant_id", nullable = false, updatable = false)
    private Long restaurantId;

    @Column(name = "courier_id", updatable = false)    // null if no courier ever held the order
    private Long courierId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private OrderStatus finalStatus;

    // When the order reached each state, copied from the order (R-PRC-03).
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "ledger_entry_timestamps",
            joinColumns = @JoinColumn(name = "ledger_entry_id"))
    @MapKeyEnumerated(EnumType.STRING)
    @MapKeyColumn(name = "status", length = 20)
    @Column(name = "reached_at", nullable = false)
    private Map<OrderStatus, Instant> timestamps = new EnumMap<>(OrderStatus.class);

    @Column(nullable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, updatable = false)
    private Instant recordedAt;

    // REFUND only: the CHARGE entry it reverses. Unique: a charge is refunded at most once.
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_of_entry_id", unique = true, updatable = false)
    private LedgerEntry refundOf;

    @Column(updatable = false)                          // REFUND only, optional
    private String reason;

    // Required by JPA. Not for our code.
    protected LedgerEntry() { }

    private LedgerEntry(LedgerEntryType type, Long orderId, Long customerId,
                        Long restaurantId, Long courierId, OrderStatus finalStatus,
                        Map<OrderStatus, Instant> timestamps, BigDecimal amount,
                        LedgerEntry refundOf, String reason) {
        this.id = UUID.randomUUID();
        this.type = Objects.requireNonNull(type, "type");
        this.orderId = Objects.requireNonNull(orderId, "orderId");
        this.customerId = Objects.requireNonNull(customerId, "customerId");
        this.restaurantId = Objects.requireNonNull(restaurantId, "restaurantId");
        this.courierId = courierId;
        this.finalStatus = Objects.requireNonNull(finalStatus, "finalStatus");
        if (timestamps != null) this.timestamps.putAll(timestamps);
        this.amount = Objects.requireNonNull(amount, "amount").setScale(2, RoundingMode.HALF_UP);
        this.recordedAt = Instant.now();
        this.refundOf = refundOf;
        this.reason = (reason == null || reason.isBlank()) ? null : reason.trim();
    }

    /**
     * CHARGE for an order that has just reached a final state.
     * DELIVERED: charged the fare total saved at placement (BillingRecord).
     * REJECTED / CANCELLED: charged 0 -- the customer pays nothing for an order
     * that was never delivered; the entry still records its final state and timestamps.
     */
    public static LedgerEntry charge(Order order, BigDecimal fareTotal) {
        Objects.requireNonNull(order, "order");
        Objects.requireNonNull(fareTotal, "fareTotal");
        if (!CHARGEABLE.contains(order.getStatus())) {
            throw new IllegalStateException("Order " + order.getOrderId()
                    + " cannot be charged while " + order.getStatus());
        }
        if (fareTotal.signum() < 0) {
            throw new IllegalArgumentException("A charge must not be negative");
        }
        BigDecimal amount = order.getStatus() == OrderStatus.DELIVERED ? fareTotal : BigDecimal.ZERO;
        return new LedgerEntry(LedgerEntryType.CHARGE, order.getOrderId(),
                order.getCustomer().getUserId(), order.getRestaurant().getRestaurantId(),
                courierIdOf(order), order.getStatus(), order.getTimestamps(),
                amount, null, null);
    }

    /**
     * REFUND reversing a delivered order's recorded CHARGE. Call after order.refund(),
     * so the order is REFUNDED and its timestamps include the refund.
     */
    public static LedgerEntry refund(LedgerEntry charge, Order order, String reason) {
        Objects.requireNonNull(charge, "charge");
        Objects.requireNonNull(order, "order");
        if (charge.type != LedgerEntryType.CHARGE) {
            throw new IllegalArgumentException("A refund must reverse a CHARGE entry");
        }
        if (!charge.orderId.equals(order.getOrderId())) {
            throw new IllegalArgumentException("Charge " + charge.id
                    + " belongs to order " + charge.orderId + ", not " + order.getOrderId());
        }
        if (charge.finalStatus != OrderStatus.DELIVERED) {
            throw new IllegalStateException("Only a delivered order can be refunded (order "
                    + charge.orderId + " ended " + charge.finalStatus + ")");
        }
        if (order.getStatus() != OrderStatus.REFUNDED) {
            throw new IllegalStateException("Order " + order.getOrderId()
                    + " must be REFUNDED before its refund entry is written");
        }
        return new LedgerEntry(LedgerEntryType.REFUND, charge.orderId, charge.customerId,
                charge.restaurantId, charge.courierId, OrderStatus.REFUNDED,
                order.getTimestamps(), charge.amount.negate(), charge, reason);
    }

    private static Long courierIdOf(Order order) {
        return order.getCourier() == null ? null : order.getCourier().getUserId();
    }

    // ---- getters (no setters: entries never change) ----
    public UUID getId() { return id; }
    public LedgerEntryType getType() { return type; }
    public Long getOrderId() { return orderId; }
    public Long getCustomerId() { return customerId; }
    public Long getRestaurantId() { return restaurantId; }
    public Long getCourierId() { return courierId; }
    public OrderStatus getFinalStatus() { return finalStatus; }
    public Map<OrderStatus, Instant> getTimestamps() { return Collections.unmodifiableMap(timestamps); }
    public BigDecimal getAmount() { return amount; }
    public Instant getRecordedAt() { return recordedAt; }
    public LedgerEntry getRefundOf() { return refundOf; }
    public UUID getRefundOfEntryId() { return refundOf == null ? null : refundOf.getId(); }
    public String getReason() { return reason; }

    // ---- identity ----
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof LedgerEntry other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
