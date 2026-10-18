package com.sweetbyte.eats.application.model;

import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "order_lines") // we can change the table name later
public class OrderLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderLineId;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, updatable = false)
    private Order order;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false, updatable = false)
    private MenuItem item;

    @Column(nullable = false, updatable = false)
    private Integer quantity;

    // Price copied from the menu item when the order is placed,
    // so later menu price changes don't alter past orders.
    // precision/scale are ignored by Hibernate for Double, so the column type is set explicitly.
    @Column(nullable = false, updatable = false, columnDefinition = "DECIMAL(10,2)")
    private Double unitPrice;

    // Required by JPA to load rows from the database. Not for our code.
    protected OrderLine() { }

    // Package-private: only Order.addLine creates lines.
    OrderLine(Order order, MenuItem item, int quantity) {
        this.order = Objects.requireNonNull(order, "order is required");
        this.item = Objects.requireNonNull(item, "item is required");
        if (quantity <= 0) {
            throw new IllegalArgumentException("quantity must be greater than 0");
        }
        this.quantity = quantity;
        this.unitPrice = Objects.requireNonNull(item.getPrice(), "item price is required");
    }

    // ---- getters ----
    public Long getOrderLineId()  { return orderLineId; }
    public Order getOrder()       { return order; }
    public MenuItem getItem()     { return item; }
    public Integer getQuantity()  { return quantity; }
    public Double getUnitPrice()  { return unitPrice; }

    // ---- behaviour ----
    public double getLineTotal() {
        return unitPrice * quantity;
    }

    // ---- identity (same idea as Order) ----
    //Two order lines count as “the same” if they have the same database ID, 
    // and a line that hasn’t been saved yet is only equal to itself
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OrderLine other)) return false;
        return orderLineId != null && orderLineId.equals(other.orderLineId);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}