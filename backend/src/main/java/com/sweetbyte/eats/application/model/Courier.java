package com.sweetbyte.eats.application.model;

import java.util.Objects;
import java.util.UUID;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.InvalidTransitionException;

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
    public Courier(UUID authUid, String name, String email,
                   double latitude, double longitude) {
        super(authUid, name, email, Role.COURIER);
        updateLocation(latitude, longitude);
    }

    // ---- getters ----
    public CourierStatus getStatus() { return status; }
    public double getLatitude()      { return latitude; }
    public double getLongitude()     { return longitude; }

    // ---- behaviour ----
    // Only an idle (so on-duty, empty-handed) courier can be offered an order (R-DLV-02).
    // Holding at most one order (R-DLV-03) follows: ASSIGNED/CARRYING are never offered.
    public boolean isAvailable() {
        return status == CourierStatus.IDLE;
    }

    public boolean isOnDuty() {
        return status != CourierStatus.OFFLINE;
    }

    // Straight-line distance on the seeded lat/long grid, used by the dispatch rule.
    // Deliberately not road or great-circle distance: routing is out of scope.
    public double distanceTo(double latitude, double longitude) {
        return Math.hypot(this.latitude - latitude, this.longitude - longitude);
    }

    // ---- lifecycle (no skipped transitions) ----
    // OFFLINE -> IDLE -> ASSIGNED -> CARRYING -> IDLE ... -> OFFLINE
    public void goOnline() {
        transition(CourierStatus.OFFLINE, CourierStatus.IDLE);
    }

    // Allowed from IDLE or ASSIGNED, never while CARRYING (R-DLV-03).
    // Going offline while ASSIGNED leaves the order stalled: it keeps this courier
    // until an operator reassigns it (R-DLV-02). Returns true in that case so the
    // service can surface the stalled order.
    public boolean goOffline() {
        if (status == CourierStatus.IDLE) {
            status = CourierStatus.OFFLINE;
            return false;
        }
        if (status == CourierStatus.ASSIGNED) {
            status = CourierStatus.OFFLINE;
            return true;
        }
        throw new InvalidTransitionException("Courier", getUserId(), status, CourierStatus.OFFLINE);
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

    // Operator reassign of an order this courier holds but has not picked up.
    // An offline courier stays offline; an assigned one becomes idle again.
    public void releaseAssignment() {
        if (status == CourierStatus.ASSIGNED) {
            status = CourierStatus.IDLE;
        } else if (status != CourierStatus.OFFLINE) {
            throw new InvalidTransitionException("Courier", getUserId(), status, CourierStatus.IDLE);
        }
    }

    // Reset: back to the seeded state.
    public void resetTo(CourierStatus seededStatus, double latitude, double longitude) {
        status = Objects.requireNonNull(seededStatus, "status is required");
        updateLocation(latitude, longitude);
    }

    //inforces a logic sequence of courier status
    private void transition(CourierStatus expected, CourierStatus next) {
        Objects.requireNonNull(next, "status is required");
        if (status != expected) {
            throw new InvalidTransitionException("Courier", getUserId(), status, next);
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