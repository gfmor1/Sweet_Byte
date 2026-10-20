package com.sweetbyte.eats.application.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.model.DomainEvent;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.DomainEventRepository;

@Service
public class EventServiceImpl implements EventService {

    private final DomainEventRepository eventRepository;

    public EventServiceImpl(DomainEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    // Joins the caller's transaction: the event is saved only if the change itself is.
    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public DomainEvent record(String entityType, Long entityId, Enum<?> from, Enum<?> to,
                              User user, String note) {
        return eventRepository.save(DomainEvent.statusChange(entityType, entityId, from, to, user, note));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DomainEvent> recent() {
        return eventRepository.findTop100ByOrderByOccurredAtDesc();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DomainEvent> history(String entityType, Long entityId) {
        return eventRepository.findByEntityTypeAndEntityIdOrderByOccurredAtAsc(entityType, entityId);
    }
}
