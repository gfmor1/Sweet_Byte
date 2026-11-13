package com.sweetbyte.eats.ui.dto;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// POST /api/orders
// restaurant id, order lines, where to deliver (address + coordinates chosen at checkout)
// and the (mock) card used to pay. Never the full card number or CVV.
public record PlaceOrderRequest(String restaurantId,
                                List<Line> lines,
                                String deliveryAddress,
                                Double latitude,
                                Double longitude,
                                Card payment) {
    public record Line(Long menuItemId, Integer quantity) {}

    public record Card(String brand, String last4, String holder, Integer expMonth, Integer expYear) {}

    /* convert list of order lines to map of menu item id + qty */
    public Map<Long, Integer> toItemQuantities() {
        if (lines == null) return Map.of();
        return lines.stream()
            .collect(Collectors.toMap(Line::menuItemId, Line::quantity, Integer::sum));
    }
}
