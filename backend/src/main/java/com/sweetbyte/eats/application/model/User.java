package com.sweetbyte.eats.application.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import com.sweetbyte.eats.application.enums.Role;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity //means that "this is a class stored in the db"
@Table(name = "users") // we can change the table name later
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    // The Supabase Auth user id (the "sub" claim of the user's JWT).
    @Column(nullable = false, unique = true, updatable = false)
    private UUID supabaseUid;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Role role;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    // Required by JPA to load rows from the database. Not for our code.
    protected User() { }

    // Called only by subclasses, each passing its own fixed role.
    protected User(UUID supabaseUid, String name, String email, Role role) {
        this.supabaseUid = Objects.requireNonNull(supabaseUid, "supabaseUid is required");
        this.name = requireText(name, "name");
        this.email = requireText(email, "email");
        this.role = Objects.requireNonNull(role, "role is required");
    }

    // ---- getters ----
    public Long getUserId()        { return userId; }
    public UUID getSupabaseUid()   { return supabaseUid; }
    public String getName()        { return name; }
    public String getEmail()       { return email; }
    public Role getRole()          { return role; }
    public Instant getCreatedAt()  { return createdAt; }

    // ---- behaviour ----
    public boolean hasRole(Role role) {
        return this.role == role;
    }

    public void rename(String newName) {
        this.name = requireText(newName, "name");
    }

    // ---- lifecycle ----
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    // ---- helpers ----
    protected static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.trim();
    }

    //Customer, Courier and Restaurant all hold coordinates. 
    //Putting the rule in one method means it’s written once, and if it ever changes 
    //(lets say we'd like to restrict positions to your city’s area), you change it here
    protected static void requireValidCoordinates(double latitude, double longitude) {
    if (latitude < -90 || latitude > 90) {
        throw new IllegalArgumentException("latitude must be between -90 and 90");
    }
    if (longitude < -180 || longitude > 180) {
        throw new IllegalArgumentException("longitude must be between -180 and 180");
    }
}

    // ---- identity ----
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User other)) return false;
        return supabaseUid != null && supabaseUid.equals(other.supabaseUid);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(supabaseUid);
    }
}