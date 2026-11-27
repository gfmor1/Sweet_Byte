package com.sweetbyte.eats.application.model;

import java.util.Map;

// What the customer asks for at checkout (Introduce Parameter Object, R4).
// The acting user is passed separately, like every other OrderService call.
// Deliberately no validation here: placeOrder owns the checks and their order.
public record PlaceOrderCommand(Long restaurantId,
                                Map<Long, Integer> itemQuantities,
                                String deliveryAddress,
                                Double latitude,
                                Double longitude,
                                CardDetails card) { }
