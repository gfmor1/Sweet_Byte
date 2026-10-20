package com.sweetbyte.eats.repository.persistence;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sweetbyte.eats.application.model.DomainEvent;

public interface DomainEventRepository extends JpaRepository<DomainEvent, UUID> {
    List<DomainEvent> findTop100ByOrderByOccurredAtDesc();
    List<DomainEvent> findByEntityTypeAndEntityIdOrderByOccurredAtAsc(String entityType, Long entityId);
}
