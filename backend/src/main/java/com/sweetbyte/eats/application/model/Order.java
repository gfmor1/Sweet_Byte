package com.sweetbyte.eats.application.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;

import org.hibernate.annotations.Generated;

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

    @Generated                                     // the database fills it on insert
    @Column(nullable = false, insertable = false, updatable = false)
    private Long arrivalSeq;

    @Column(nullable = false, updatable = false)
    private Instant placedAt;

    private Instant acceptedAt;
    private Instant readyAt;
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
    }

    public void startPreparing() {
        transition(OrderStatus.ACCEPTED, OrderStatus.PREPARING);
    }

    public void markReady() {
        transition(OrderStatus.PREPARING, OrderStatus.READY);
        readyAt = Instant.now();
    }

    public void cancelByCustomer() {
        transition(OrderStatus.PLACED, OrderStatus.CANCELLED);
    }

    public void cancelByOperator() {
        EnumSet<OrderStatus> cancellable = EnumSet.of(
                OrderStatus.PLACED, OrderStatus.ACCEPTED,
                OrderStatus.PREPARING, OrderStatus.READY);
        if (!cancellable.contains(status)) {
            throw new InvalidTransitionException("Order", orderId, status, OrderStatus.CANCELLED);
        }
        status = OrderStatus.CANCELLED;
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
    public Instant getReadyAt()         { return readyAt; }
    public String getRejectionReason()  { return rejectionReason; }
    public List<OrderLine> getLines()   { return Collections.unmodifiableList(lines); }

    // ---- identity ----
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Order other)) return false;
        return orderId != null && orderId.equals(other.orderId);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}