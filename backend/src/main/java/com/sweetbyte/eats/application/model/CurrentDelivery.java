package com.sweetbyte.eats.application.model;

// The order a courier is currently offered (accepted = false) or holds (accepted = true).
public record CurrentDelivery(Order order, Courier courier, boolean accepted) {
}
