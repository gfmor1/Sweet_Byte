package com.sweetbyte.eats.application.model;

import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import com.sweetbyte.eats.application.enums.OrderStatus;

// FIFO queue of one restaurant's ACCEPTED orders, waiting to be prepared.
// Not an entity: it isn't stored in its own table. 
// The service rebuilds it from the database whenever it's needed
// Order of arrival comes from Order.arrivalSeq, which the database assigns on insert,
// so "first in" means "first placed", whatever order the list arrives in
public class PreparationQueue {

    
    private static final Comparator<Order> BY_ARRIVAL =
            Comparator.comparing(Order::getArrivalSeq);

    private final Restaurant restaurant;
    private final Deque<Order> queue = new ArrayDeque<>();

    public PreparationQueue(Restaurant restaurant, Collection<Order> acceptedOrders) {
        this.restaurant = Objects.requireNonNull(restaurant, "restaurant is required");
        Objects.requireNonNull(acceptedOrders, "acceptedOrders is required")
                .stream()
                .peek(this::checkBelongsHere)
                .sorted(BY_ARRIVAL)
                .forEach(queue::addLast);
    }

    // ---- FIFO operations ----

    // Adds a newly accepted order at the back of the queue
    public void enqueue(Order order) {
        checkBelongsHere(order);
        Order last = queue.peekLast();
        if (last != null && order.getArrivalSeq() < last.getArrivalSeq()) {
            throw new IllegalArgumentException(
                    "Order " + order.getOrderId() + " arrived before the last order in the queue");
        }
        queue.addLast(order);
    }

    // The order that must be prepared next, without removing it
    public Optional<Order> peek() {
        return Optional.ofNullable(queue.peekFirst());
    }

    // Removes the order at the front and changes it to PREPARING
    // The kitchen can only start the order at the front, never skip ahead
    public Order startNext() {
        Order next = queue.pollFirst();
        if (next == null) {
            throw new IllegalStateException(restaurant.getName() + " has no orders waiting");
        }
        next.startPreparing();
        return next;
    }

    // ---- queries ----

    // 1 = next to be prepared. Empty if the order isn't waiting in this queue.
    public Optional<Integer> positionOf(Order order) {
        int position = 1;
        for (Order waiting : queue) {
            if (waiting.equals(order)) {
                return Optional.of(position);
            }
            position++;
        }
        return Optional.empty();
    }

    public int size()                { return queue.size(); } //how many orders are waiting
    public boolean isEmpty()         { return queue.isEmpty(); }
    public Restaurant getRestaurant() { return restaurant; }

    // returns a read-only copy of the line, front first, for showing it on screen (read only)
    public List<Order> getOrders() {
        return List.copyOf(queue);
    }

    // ---- helpers ----
    //safety check
    private void checkBelongsHere(Order order) {
        Objects.requireNonNull(order, "order is required");
        if (!Objects.equals(order.getRestaurant().getRestaurantId(), restaurant.getRestaurantId())) {
            throw new IllegalArgumentException("Order " + order.getOrderId() + " belongs to another restaurant");
        }
        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new IllegalArgumentException(
                    "Only ACCEPTED orders can wait for preparation, order "
                    + order.getOrderId() + " is " + order.getStatus());
        }
        if (order.getArrivalSeq() == null) {
            throw new IllegalArgumentException("Order must be saved before it can be queued");
        }
    }
}