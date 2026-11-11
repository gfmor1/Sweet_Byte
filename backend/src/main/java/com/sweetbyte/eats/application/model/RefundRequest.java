package com.sweetbyte.eats.application.model;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.RefundRequestStatus;
import com.sweetbyte.eats.application.exceptions.InvalidTransitionException;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * A customer's request to refund a delivered order (Refund Request module).
 * The operator approves or rejects it; approval triggers the Automatic Credit Refund.
 *
 * One request per order (unique order_id): the operator's verdict is final.
 * Plain ids, not entity links (same as LedgerEntry): these ids are what the
 * role-scoped views filter on, and they never change.
 */
@Entity
@Table(name = "refund_requests",
        indexes = {
                @Index(columnList = "customer_id"),
                @Index(columnList = "restaurant_id"),
                @Index(columnList = "status")
        })
public class RefundRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long requestId;

    @Column(name = "order_id", nullable = false, updatable = false, unique = true)
    private Long orderId;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private Long customerId;

    @Column(name = "restaurant_id", nullable = false, updatable = false)
    private Long restaurantId;

    @Column(nullable = false, updatable = false)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RefundRequestStatus status;

    @Column(nullable = false, updatable = false)
    private Instant requestedAt;

    private Instant decidedAt;
    private Long decidedBy;            // operator's user id
    private String operatorNote;

    // Required by JPA. Not for our code.
    protected RefundRequest() { }

    private RefundRequest(Long orderId, Long customerId, Long restaurantId, String reason, Instant now) {
        this.orderId = orderId;
        this.customerId = customerId;
        this.restaurantId = restaurantId;
        this.reason = reason;
        this.status = RefundRequestStatus.PENDING;
        this.requestedAt = now;
    }

    // Opens a request for a delivered order, within the configured window after delivery.
    public static RefundRequest open(Order order, String reason, Duration window, Instant now) {
        Objects.requireNonNull(order, "order");
        Objects.requireNonNull(window, "window");
        Objects.requireNonNull(now, "now");
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("A refund request needs a reason");
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new IllegalStateException("Only a delivered order can be refunded (order "
                    + order.getOrderId() + " is " + order.getStatus() + ")");
        }
        Instant deadline = order.getDeliveredAt().plus(window);
        if (now.isAfter(deadline)) {
            throw new IllegalStateException("The refund window for order " + order.getOrderId()
                    + " closed " + window.toMinutes() + " minutes after delivery");
        }
        return new RefundRequest(order.getOrderId(), order.getCustomer().getUserId(),
                order.getRestaurant().getRestaurantId(), reason.trim(), now);
    }

    // ---- operator verdict (PENDING only, final) ----
    public void approve(Long operatorId, String note) {
        decide(RefundRequestStatus.APPROVED, operatorId, note);
    }

    public void reject(Long operatorId, String note) {
        if (note == null || note.isBlank()) {
            throw new IllegalArgumentException("A rejection needs a reason for the customer");
        }
        decide(RefundRequestStatus.REJECTED, operatorId, note);
    }

    private void decide(RefundRequestStatus verdict, Long operatorId, String note) {
        Objects.requireNonNull(operatorId, "operatorId");
        if (status != RefundRequestStatus.PENDING) {
            throw new InvalidTransitionException("RefundRequest", requestId, status, verdict);
        }
        status = verdict;
        decidedAt = Instant.now();
        decidedBy = operatorId;
        operatorNote = (note == null || note.isBlank()) ? null : note.trim();
    }

    // ---- getters ----
    public Long getRequestId()              { return requestId; }
    public Long getOrderId()              { return orderId; }
    public Long getCustomerId()           { return customerId; }
    public Long getRestaurantId()         { return restaurantId; }
    public String getReason()             { return reason; }
    public RefundRequestStatus getStatus()  { return status; }
    public Instant getRequestedAt()       { return requestedAt; }
    public Instant getDecidedAt()         { return decidedAt; }
    public Long getDecidedBy()            { return decidedBy; }
    public String getOperatorNote()       { return operatorNote; }

    // ---- identity ----
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RefundRequest other)) return false;
        return requestId != null && requestId.equals(other.getRequestId());
    }

    @Override
    public int hashCode() {
        return RefundRequest.class.hashCode();
    }
}
