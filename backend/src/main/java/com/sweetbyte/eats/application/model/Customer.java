package com.sweetbyte.eats.application.model;

import java.util.UUID;

import com.sweetbyte.eats.application.enums.Role;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "customers") // we can change the table name later
public class Customer extends User {

    // What the customer typed, shown back to them and to the restaurant.
    @Column(nullable = false)
    private String deliveryAddress;

    // Where the system places them on the map. Never typed by the customer:
    // the service resolves them (from the seed file, or the chosen zone)
    // before creating or updating a Customer.
    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    protected Customer() { }

    public Customer(UUID supabaseUid, String name, String email,
                    String deliveryAddress, double latitude, double longitude) {
        super(supabaseUid, name, email, Role.CUSTOMER);
        changeDelivery(deliveryAddress, latitude, longitude);
    }

    // ---- behaviour ----
    // Address and position always change together, so they can never disagree.
    public void changeDelivery(String deliveryAddress, double latitude, double longitude) {
        requireValidCoordinates(latitude, longitude);
        this.deliveryAddress = requireText(deliveryAddress, "deliveryAddress");
        this.latitude = latitude;
        this.longitude = longitude;
    }

    // ---- getters ----
    public String getDeliveryAddress() { return deliveryAddress; }
    public double getLatitude()        { return latitude; }
    public double getLongitude()       { return longitude; }
}