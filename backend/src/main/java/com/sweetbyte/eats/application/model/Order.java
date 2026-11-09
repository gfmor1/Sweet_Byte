package com.sweetbyte.eats.application.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.hibernate.annotations.Generated;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.exceptions.InvalidTransitionException;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "orders") // we can change the table name later
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderId;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false, updatable = false)
    private Customer customer;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "restaurant_id", nullable = false, updatable = false)
    private Restaurant restaurant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "courier_id")              // stays null until DLV assigns one
    private Courier courier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    // the database fills it on insert (bigserial = auto-incrementing sequence), used for FIFO order
    @Generated
    @Column(nullable = false, insertable = false, updatable = false, columnDefinition = "bigserial")
    private Long arrivalSeq;

    @Column(nullable = false, updatable = false)
    private Instant placedAt;

    // One timestamp per state reached (R-PRC-03: the ledger keeps them all).
    private Instant acceptedAt;
    private Instant preparingAt;
    private Instant readyAt;
    private Instant pickedUpAt;
    private Instant deliveredAt;
    private Instant refundedAt;
    private Instant rejectedAt;
    private Instant cancelledAt;
    private String rejectionReason;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderLine> lines = new ArrayList<>();

    protected Order() { }

    public Order(Customer customer, Restaurant restaurant) {
        this.customer = Objects.requireNonNull(customer, "customer is required");
        this.restaurant = Objects.requireNonNull(restaurant, "restaurant is required");
        if (!restaurant.canAcceptOrders()) {                       // R-ORD-02
            throw new IllegalStateException(restaurant.getName() + " is not accepting orders");
        }
        this.status = OrderStatus.PLACED;
        this.placedAt = Instant.now();
    }

    // ---- building the order (only before it is saved) ----
    public void addLine(MenuItem item, int quantity) {
        if (orderId != null) {
            throw new IllegalStateException("Lines can only be added before the order is saved");
        }
        Objects.requireNonNull(item, "item is required");
        if (!Objects.equals(item.getRestaurant().getRestaurantId(), restaurant.getRestaurantId())) {
            throw new IllegalArgumentException(item.getName() + " belongs to another restaurant");
        }
        if (!item.isAvailable()) {                                  // R-ORD-02
            throw new IllegalStateException(item.getName() + " is sold out");
        }
        lines.add(new OrderLine(this, item, quantity));
    }

    @PrePersist
    private void checkHasLines() {
        if (lines.isEmpty()) {
            throw new IllegalStateException("An order needs at least one line");
        }
    }

    // ---- lifecycle (R-ORD-04: no skipped transitions) ----
    public void accept() {
        transition(OrderStatus.PLACED, OrderStatus.ACCEPTED);
        acceptedAt = Instant.now();
    }

    public void reject(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("A rejection needs a reason");
        }
        transition(OrderStatus.PLACED, OrderStatus.REJECTED);
        rejectionReason = reason.trim();
        rejectedAt = Instant.now();
    }

    public void startPreparing() {
        transition(OrderStatus.ACCEPTED, OrderStatus.PREPARING);
        preparingAt = Instant.now();
    }

    public void markReady() {
        transition(OrderStatus.PREPARING, OrderStatus.READY);
        readyAt = Instant.now();
    }

    public void cancelByCustomer() {
        transition(OrderStatus.PLACED, OrderStatus.CANCELLED);
        cancelledAt = Instant.now();
    }

    // Operator only. Not once a courier holds the order: by then it is out of the kitchen.
    public void cancelByOperator() {
        EnumSet<OrderStatus> cancellable = EnumSet.of(
                OrderStatus.PLACED, OrderStatus.ACCEPTED,
                OrderStatus.PREPARING, OrderStatus.READY);
        if (!cancellable.contains(status)) {
            throw new InvalidTransitionException("Order", orderId, status, OrderStatus.CANCELLED);
        }
        if (courier != null) {
            throw new IllegalStateException("Order " + orderId
                    + " is assigned to a courier; unassign it before cancelling");
        }
        status = OrderStatus.CANCELLED;
        cancelledAt = Instant.now();
    }

    // ---- delivery (DLV) ----
    // Binds the order to the courier who accepted the offer.
    // Order status stays READY: "assigned" is a courier state, not an order state.
    // The service calls courier.assign() in the same transaction.
    public void assignCourier(Courier newCourier) {
        Objects.requireNonNull(newCourier, "courier is required");
        if (status != OrderStatus.READY) {                          // R-DLV-01
            throw new IllegalStateException("Order " + orderId
                    + " can only be assigned once it is READY (it is " + status + ")");
        }
        if (courier != null) {                                      // R-DLV-02
            throw new IllegalStateException("Order " + orderId + " is already assigned to courier "
                    + courier.getUserId() + "; only an operator can reassign it");
        }
        courier = newCourier;
    }

    // Operator reassign (R-DLV-02): frees a READY order whose courier went offline,
    // so dispatch can offer it again. Not allowed once picked up.
    public void unassignCourier() {
        if (status != OrderStatus.READY || courier == null) {
            throw new IllegalStateException("Order " + orderId
                    + " can only be unassigned while READY and assigned (it is " + status + ")");
        }
        courier = null;
    }

    // Handoff 1: restaurant -> courier (R-ORD-04: never before READY).
    public void pickUp(Courier by) {
        requireAssignedTo(by);
        transition(OrderStatus.READY, OrderStatus.PICKED_UP);
        pickedUpAt = Instant.now();
    }

    // Handoff 2: courier -> customer.
    public void deliver(Courier by) {
        requireAssignedTo(by);
        transition(OrderStatus.PICKED_UP, OrderStatus.DELIVERED);
        deliveredAt = Instant.now();
    }

    // Operator refund of a delivered order (UC-PRC-05).
    public void refund() {
        transition(OrderStatus.DELIVERED, OrderStatus.REFUNDED);
        refundedAt = Instant.now();
    }

    // Stalled: its courier accepted it, then went offline before pickup (R-DLV-02).
    public boolean isStalled() {
        return status == OrderStatus.READY && courier != null && courier.getStatus() == CourierStatus.OFFLINE;
    }

    private void requireAssignedTo(Courier by) {
        Objects.requireNonNull(by, "courier is required");
        if (courier == null || !courier.equals(by)) {
            throw new IllegalStateException("Order " + orderId
                    + " is not assigned to courier " + by.getUserId());
        }
    }

    private void transition(OrderStatus expected, OrderStatus next) {
        if (status != expected) {
            throw new InvalidTransitionException("Order", orderId, status, next);
        }
        status = next;
    }

    // ---- getters ----
    public Long getOrderId()            { return orderId; }
    public Customer getCustomer()       { return customer; }
    public Restaurant getRestaurant()   { return restaurant; }
    public Courier getCourier()         { return courier; }
    public OrderStatus getStatus()      { return status; }
    public Long getArrivalSeq()         { return arrivalSeq; }
    public Instant getPlacedAt()        { return placedAt; }
    public Instant getAcceptedAt()      { return acceptedAt; }
    public Instant getPreparingAt()     { return preparingAt; }
    public Instant getReadyAt()         { return readyAt; }
    public Instant getPickedUpAt()      { return pickedUpAt; }
    public Instant getDeliveredAt()     { return deliveredAt; }
    public Instant getRefundedAt()      { return refundedAt; }
    public Instant getRejectedAt()      { return rejectedAt; }
    public Instant getCancelledAt()     { return cancelledAt; }
    public String getRejectionReason()  { return rejectionReason; }
    public List<OrderLine> getLines()   { return Collections.unmodifiableList(lines); }

    public boolean isTerminal() {
        return EnumSet.of(OrderStatus.DELIVERED, OrderStatus.REFUNDED,
                OrderStatus.REJECTED, OrderStatus.CANCELLED).contains(status);
    }

    // Every state reached so far and when, in lifecycle order (for the ledger, R-PRC-03).
    public Map<OrderStatus, Instant> getTimestamps() {
        Map<OrderStatus, Instant> t = new EnumMap<>(OrderStatus.class);
        putIfSet(t, OrderStatus.PLACED, placedAt);
        putIfSet(t, OrderStatus.ACCEPTED, acceptedAt);
        putIfSet(t, OrderStatus.PREPARING, preparingAt);
        putIfSet(t, OrderStatus.READY, readyAt);
        putIfSet(t, OrderStatus.PICKED_UP, pickedUpAt);
        putIfSet(t, OrderStatus.DELIVERED, deliveredAt);
        putIfSet(t, OrderStatus.REFUNDED, refundedAt);
        putIfSet(t, OrderStatus.REJECTED, rejectedAt);
        putIfSet(t, OrderStatus.CANCELLED, cancelledAt);
        return Collections.unmodifiableMap(t);
    }

    private static void putIfSet(Map<OrderStatus, Instant> t, OrderStatus s, Instant at) {
        if (at != null) t.put(s, at);
    }

    // Sum of the order lines, exact to the cent (input to the fare, R-PRC-01).
    public BigDecimal getSubtotal() {
        return lines.stream()
                .map(OrderLine::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    // ---- identity ----
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Order other)) return false;
        return orderId != null && orderId.equals(other.getOrderId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}