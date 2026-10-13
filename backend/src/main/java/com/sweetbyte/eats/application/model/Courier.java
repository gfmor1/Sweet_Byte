package com.sweetbyte.eats.application.model;

import java.util.Objects;
import java.util.UUID;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.Role;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "couriers") // we can change the table name later
public class Courier extends User {

    @Enumerated(EnumType.STRING) //tell jpa how to save the enum in the db
    @Column(nullable = false)
    private CourierStatus status = CourierStatus.OFFLINE; //default status

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    // Required by JPA to load rows from the database. Not for our code.
    protected Courier() { }

    // New couriers always start OFFLINE.
    public Courier(UUID supabaseUid, String name, String email,
                   double latitude, double longitude) {
        super(supabaseUid, name, email, Role.COURIER);
        updateLocation(latitude, longitude);
    }

    // ---- getters ----
    public CourierStatus getStatus() { return status; }
    public double getLatitude()      { return latitude; }
    public double getLongitude()     { return longitude; }

    // ---- behaviour ----
    // Only an idle courier can be given a new order.
    public boolean isAvailable() {
        return status == CourierStatus.IDLE;
    }

    // ---- lifecycle (no skipped transitions) ----
    // OFFLINE -> IDLE -> ASSIGNED -> CARRYING -> IDLE ... -> OFFLINE
    public void goOnline() {
        transition(CourierStatus.OFFLINE, CourierStatus.IDLE);
    }

    // Can't log off in the middle of a delivery.
    public void goOffline() {
        transition(CourierStatus.IDLE, CourierStatus.OFFLINE);
    }

    // An order has been given to this courier.
    public void assign() {
        transition(CourierStatus.IDLE, CourierStatus.ASSIGNED);
    }

    // The courier picked the order up at the restaurant.
    public void pickUp() {
        transition(CourierStatus.ASSIGNED, CourierStatus.CARRYING);
    }

    // The order was delivered; the courier is free for a new one.
    public void finishDelivery() {
        transition(CourierStatus.CARRYING, CourierStatus.IDLE);
    }

    //inforces a logic sequence of courier status
    private void transition(CourierStatus expected, CourierStatus next) {
        Objects.requireNonNull(next, "status is required");
        if (status != expected) {
            throw new IllegalStateException(
                    "Courier " + getUserId() + " cannot go from " + status + " to " + next);
        }
        status = next;
    }

    // Uses the shared coordinate rule in User.
    public void updateLocation(double latitude, double longitude) {
        requireValidCoordinates(latitude, longitude);
        this.latitude = latitude;
        this.longitude = longitude;
    }
}