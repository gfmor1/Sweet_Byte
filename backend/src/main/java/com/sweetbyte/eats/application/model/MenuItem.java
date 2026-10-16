package com.sweetbyte.eats.application.model;

import com.sweetbyte.eats.application.enums.MenuItemStatus;

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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "menu_items") // we can change the table name later
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long itemId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Column(name = "name", nullable = false)
    private String name;

    // precision/scale are ignored by Hibernate for Double, so the column type is set explicitly
    @Column(name = "price", nullable = false, columnDefinition = "DECIMAL(10,2)")
    private Double price;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MenuItemStatus status;

    protected MenuItem() {
        // required by JPA
    }

    public MenuItem(Restaurant restaurant, String name, Double price, MenuItemStatus status) {
        this.restaurant = restaurant;
        this.name = validateName(name);
        this.price = validatePrice(price);
        this.status = status;
    }

    // ---- Validation ----

    private static String validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Menu item name must not be null or blank");
        }
        return name.trim();
    }

    private static Double validatePrice(Double price) {
        if (price == null) {
            throw new IllegalArgumentException("Menu item price must not be null");
        }
        if (price < 0) {
            throw new IllegalArgumentException("Menu item price must not be negative, got: " + price);
        }
        return price;
    }

    // re-checks before we writes to the DB,
    // in case a field was set some other way 
    @PrePersist
    @PreUpdate
    private void validate() {
        validateName(name);
        validatePrice(price);
    }

    // ---- Getters / setters ----

    public Long getItemId() {
        return itemId;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public void setRestaurant(Restaurant restaurant) {
        this.restaurant = restaurant;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = validateName(name);
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = validatePrice(price);
    }

    public MenuItemStatus getStatus() {
        return status;
    }

    // Used by Order.addLine (R-ORD-02): sold-out items can't be ordered.
    public boolean isAvailable() {
        return status == MenuItemStatus.AVAILABLE;
    }

    public void setStatus(MenuItemStatus status) {
        this.status = status;
    }
}