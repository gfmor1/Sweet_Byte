package com.sweetbyte.eats.application.model;

import java.util.UUID;

import com.sweetbyte.eats.application.enums.Role;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "operators") // we can change the table name later
public class Operator extends User {

    protected Operator() { }

    public Operator(UUID supabaseUid, String name, String email) {
        super(supabaseUid, name, email, Role.OPERATOR);
    }
}