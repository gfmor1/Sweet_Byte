package com.sweetbyte.eats.application.service;

// Published when a restaurant marks an order ready; DLV picks it up once that change is committed.
public record OrderReadyEvent(Long orderId) {
}
