package com.sweetbyte.eats.application.model;

import java.util.Objects;
import java.util.UUID;

import com.sweetbyte.eats.application.enums.Role;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "restaurant_owners")
public class RestaurantOwner extends User {

    // One restaurant per owner account, set at registration and never replaced.
    // PERSIST: saving a new owner also saves the new restaurant entered at registration.
    @OneToOne(optional = false, fetch = FetchType.LAZY, cascade = CascadeType.PERSIST)
    @JoinColumn(name = "restaurant_id", nullable = false, unique = true, updatable = false)
    private Restaurant restaurant;

    // Required by JPA to load rows from the database. Not for our code.
    protected RestaurantOwner() { }

    // An owner always registers together with their restaurant.
    public RestaurantOwner(UUID supabaseUid, String name, String email, Restaurant restaurant) {
        super(supabaseUid, name, email, Role.RESTAURANT_OWNER);
        this.restaurant = Objects.requireNonNull(restaurant, "restaurant is required");
    }

    // ---- getters ----
    public Restaurant getRestaurant() { return restaurant; }
}