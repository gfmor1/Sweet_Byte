package com.sweetbyte.eats.application.model;

import java.util.Objects;

import com.sweetbyte.eats.application.enums.RestaurantStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "restaurants") // we can change the table name later
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long restaurantId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RestaurantStatus status;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    // Required by JPA to load rows from the database. Not for our code.
    protected Restaurant() { }

    // New restaurants start CLOSED until the owner opens them.
    public Restaurant(String name, double latitude, double longitude) {
        this.name = User.requireText(name, "name");
        this.status = RestaurantStatus.CLOSED;
        relocate(latitude, longitude);
    }

    // ---- getters ----
    public Long getRestaurantId()       { return restaurantId; }
    public String getName()             { return name; }
    public RestaurantStatus getStatus() { return status; }
    public double getLatitude()         { return latitude; }
    public double getLongitude()        { return longitude; }

    // ---- behaviour ----
    // only an open restaurant can take new orders.
    public boolean canAcceptOrders() {
        return status == RestaurantStatus.OPEN;
    }

    public void open() {
        this.status = RestaurantStatus.OPEN;
    }

    public void close() {
        this.status = RestaurantStatus.CLOSED;
    }

    public void changeStatus(RestaurantStatus newStatus) {
        this.status = Objects.requireNonNull(newStatus, "status is required");
    }

    public void rename(String newName) {
        this.name = User.requireText(newName, "name");
    }

    public void pause() {
        this.status = RestaurantStatus.PAUSED; 
    }

    // Uses the shared coordinate rule in User so it's written once.
    public void relocate(double latitude, double longitude) {
        User.requireValidCoordinates(latitude, longitude);
        this.latitude = latitude;
        this.longitude = longitude;
    }

    // ---- identity (same approach as Order) ----
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Restaurant other)) return false;
        return restaurantId != null && restaurantId.equals(other.restaurantId);
    }

    //It gives every object of the class the same “label” so Java can always find it in a set or map, 
    //even after the database gives it an ID, while equals handles telling the objects apart.
    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}