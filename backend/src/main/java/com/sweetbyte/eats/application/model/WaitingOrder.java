package com.sweetbyte.eats.application.model;

import java.time.Instant;

// A ready order in the dispatch queue, and when it joined.
public record WaitingOrder(Order order, Instant since) {
}
