package com.sweetbyte.eats.application.model;

import java.time.Instant;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Ready orders that no courier could take yet, oldest first (R-DLV-04).
 * Retried whenever a courier becomes idle.
 * In memory: rebuilt from READY orders with no courier on startup/reset.
 * Methods are synchronized because one Spring bean serves concurrent requests.
 */
public class DispatchQueue {

    // Insertion order = arrival order; value = when the order joined the queue.
    private final LinkedHashMap<Long, Instant> waiting = new LinkedHashMap<>();

    public synchronized void enqueue(Long orderId, Instant at) {
        Objects.requireNonNull(orderId, "orderId");
        waiting.putIfAbsent(orderId, Objects.requireNonNull(at, "at"));
    }

    /** Puts an order at the head of the queue (declined or reassigned). */
    public synchronized void enqueueFirst(Long orderId, Instant at) {
        Objects.requireNonNull(orderId, "orderId");
        LinkedHashMap<Long, Instant> previous = new LinkedHashMap<>(waiting);
        previous.remove(orderId);
        waiting.clear();
        waiting.put(orderId, Objects.requireNonNull(at, "at"));
        waiting.putAll(previous);
    }

    /** Removes and returns the oldest waiting order, if any. */
    public synchronized Optional<Long> poll() {
        Iterator<Long> it = waiting.keySet().iterator();
        if (!it.hasNext()) return Optional.empty();
        Long orderId = it.next();
        it.remove();
        return Optional.of(orderId);
    }

    public synchronized Optional<Long> peek() {
        return waiting.keySet().stream().findFirst();
    }

    public synchronized boolean remove(Long orderId) {
        return waiting.remove(orderId) != null;
    }

    public synchronized boolean contains(Long orderId) {
        return waiting.containsKey(orderId);
    }

    public synchronized boolean isEmpty() { return waiting.isEmpty(); }

    public synchronized int size() { return waiting.size(); }

    /** Order id -> time it joined the queue, oldest first (operator view). */
    public synchronized Map<Long, Instant> snapshot() {
        return Collections.unmodifiableMap(new LinkedHashMap<>(waiting));
    }

    /** Used by Reset. */
    public synchronized void clear() { waiting.clear(); }
}