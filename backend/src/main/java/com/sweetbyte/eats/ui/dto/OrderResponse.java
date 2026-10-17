package com.sweetbyte.eats.ui.dto;

import java.time.Instant;
import java.util.List;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.OrderLine;

//id, restaurant, status, lines, timestamps
public record OrderResponse(Long orderId,
        Long restaurantId,
        String restaurantName,
        OrderStatus status,
        List<Line> lines,
        Instant placedAt,
        Instant acceptedAt,
        Instant readyAt,
        String reason) {
    public record Line(Long menuItemId, String name, Integer quantity) {
        static Line from(OrderLine line) {
            return new Line(line.getItem().getItemId(),
                    line.getItem().getName(),
                    line.getQuantity());
        }
    }

    public static OrderResponse from (Order order) {
        return new OrderResponse(order.getOrderId(),
                order.getRestaurant().getRestaurantId(),
                order.getRestaurant().getName(),
                order.getStatus(),
                order.getLines().stream().map(Line::from).toList(),
                order.getPlacedAt(),
                order.getAcceptedAt(),
                order.getReadyAt(),
                order.getRejectionReason()
        );
    }
}
