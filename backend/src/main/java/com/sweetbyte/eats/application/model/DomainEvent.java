package com.sweetbyte.eats.application.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

// One row per change in the system. Written once, never updated.
@Entity
@Table(name = "domain_events") // we can change the table name later
public class DomainEvent {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID eventId;

    // What changed: "Order", "Restaurant", "MenuItem", ...
    @Column(nullable = false, updatable = false)
    private String entityType;

    // Which one changed: the id of that entity.
    @Column(nullable = false, updatable = false)
    private Long entityId;

    // Null when the entity is being created (there is no previous state).
    @Column(updatable = false)
    private String fromState;

    @Column(nullable = false, updatable = false)
    private String toState;

    // Who made the change. Null for changes made by the system itself.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", updatable = false)
    private User user;

    @Column(nullable = false, updatable = false)
    private Instant occurredAt;

    // Optional extra info, e.g. the reason an order was rejected.
    @Column(updatable = false)
    private String note;

    // Required by JPA to load rows from the database. Not for our code.
    protected DomainEvent() { }

    public DomainEvent(String entityType, Long entityId, String fromState, String toState,
                       User user, String note) {
        this.eventId = UUID.randomUUID();
        this.entityType = User.requireText(entityType, "entityType");
        this.entityId = Objects.requireNonNull(entityId, "entityId is required");
        this.fromState = fromState;
        this.toState = User.requireText(toState, "toState");
        this.user = user;
        this.note = (note == null || note.isBlank()) ? null : note.trim();
        this.occurredAt = Instant.now();
    }

    // Convenience for status changes on enums, e.g. OrderStatus.PLACED -> OrderStatus.REJECTED.
    public static DomainEvent statusChange(String entityType, Long entityId,
                                           Enum<?> from, Enum<?> to, User user, String note) {
        return new DomainEvent(entityType, entityId,
                from == null ? null : from.name(),
                Objects.requireNonNull(to, "to is required").name(),
                user, note);
    }

    // ---- getters ----
    public UUID getEventId()       { return eventId; }
    public String getEntityType()  { return entityType; }
    public Long getEntityId()      { return entityId; }
    public String getFromState()   { return fromState; }
    public String getToState()     { return toState; }
    public User getUser()          { return user; }
    public Instant getOccurredAt() { return occurredAt; }
    public String getNote()        { return note; }

    // ---- identity ----
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DomainEvent other)) return false;
        return eventId != null && eventId.equals(other.eventId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(eventId);
    }
}