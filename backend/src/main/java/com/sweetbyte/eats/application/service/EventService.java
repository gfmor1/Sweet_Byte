package com.sweetbyte.eats.application.service;

import java.util.List;

import com.sweetbyte.eats.application.model.DomainEvent;
import com.sweetbyte.eats.application.model.User;

// Append-only log of changes in the system.
public interface EventService {
    DomainEvent record(String entityType, Long entityId, Enum<?> from, Enum<?> to, User user, String note);
    List<DomainEvent> recent();
    List<DomainEvent> history(String entityType, Long entityId);
}
