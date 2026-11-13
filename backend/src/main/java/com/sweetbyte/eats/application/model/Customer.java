package com.sweetbyte.eats.application.model;

import java.util.UUID;

import com.sweetbyte.eats.application.enums.Role;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

// The delivery address and its coordinates are not stored here: the customer chooses
// them at checkout and they are saved on each Order (see Order.deliveryAddress).
@Entity
@Table(name = "customers") // we can change the table name later
public class Customer extends User {

    protected Customer() { }

    public Customer(UUID supabaseUid, String name, String email) {
        super(supabaseUid, name, email, Role.CUSTOMER);
    }
}
