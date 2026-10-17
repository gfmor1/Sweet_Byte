package com.sweetbyte.eats.ui.dto;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
//restaurant id and a list of order lines
public record PlaceOrderRequest(String restaurantId, List<Line> lines) {
    public record Line(Long menuItemId, Integer quantity) {}

    /* convert list of order lines to map of menu item id + qty */
    public Map<Long, Integer> toItemQuantities() {
        return lines.stream()
            .collect(Collectors.toMap(Line::menuItemId, Line::quantity));
    }
}
