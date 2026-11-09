package com.sweetbyte.eats.ui.dto;

import java.time.Duration;
import java.time.Instant;

import com.sweetbyte.eats.application.model.WaitingOrder;

public record WaitingOrderResponse(Long orderId, Long restaurantId, String restaurantName,
                                   Instant readyAt, long waitingSeconds) {
    public static WaitingOrderResponse from(WaitingOrder waiting) {
        return new WaitingOrderResponse(waiting.order().getOrderId(),
                waiting.order().getRestaurant().getRestaurantId(),
                waiting.order().getRestaurant().getName(),
                waiting.order().getReadyAt(),
                Duration.between(waiting.since(), Instant.now()).toSeconds());
    }
}
