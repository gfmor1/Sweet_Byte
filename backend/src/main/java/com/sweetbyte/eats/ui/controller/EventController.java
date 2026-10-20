package com.sweetbyte.eats.ui.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.service.EventService;
import com.sweetbyte.eats.ui.dto.EventResponse;

//the event log for the dashboard’s output console
@RestController
@RequestMapping("/api/events")
public class EventController {
    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    // GET /api/events                          -> latest 100
    // GET /api/events?entityType=Order&entityId=5 -> history of one entity
    @GetMapping
    public List<EventResponse> events(@RequestParam(required = false) String entityType,
                                      @RequestParam(required = false) Long entityId) {
        var events = (entityType != null && entityId != null)
                ? eventService.history(entityType, entityId)
                : eventService.recent();
        return events.stream().map(EventResponse::from).toList();
    }
}
