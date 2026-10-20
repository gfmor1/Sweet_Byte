package com.sweetbyte.eats.ui.dto;

import java.time.Instant;
import java.util.UUID;

import com.sweetbyte.eats.application.model.DomainEvent;

public record EventResponse(UUID eventId, String entityType, Long entityId, String fromState,
                            String toState, Long userId, Instant occurredAt, String note) {

    public static EventResponse from(DomainEvent e) {
        return new EventResponse(e.getEventId(), e.getEntityType(), e.getEntityId(), e.getFromState(),
                e.getToState(), e.getUser() == null ? null : e.getUser().getUserId(),
                e.getOccurredAt(), e.getNote());
    }
}
