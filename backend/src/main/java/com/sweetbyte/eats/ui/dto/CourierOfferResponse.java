package com.sweetbyte.eats.ui.dto;

import java.util.List;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.CurrentDelivery;
import com.sweetbyte.eats.application.model.Order;

//never carries any customer payment information
public record CourierOfferResponse(Long orderId, OrderStatus orderStatus, boolean accepted,
                                   Long restaurantId, String restaurantName,
                                   double restaurantLatitude, double restaurantLongitude,
                                   double dropoffLatitude, double dropoffLongitude,
                                   List<Item> items, CourierStatus courierStatus) {
    public record Item(Long id, String name, Integer quantity) {
    }

    public static CourierOfferResponse from(CurrentDelivery delivery) {
        Order order = delivery.order();
        return new CourierOfferResponse(order.getOrderId(), order.getStatus(), delivery.accepted(),
                order.getRestaurant().getRestaurantId(), order.getRestaurant().getName(),
                order.getRestaurant().getLatitude(), order.getRestaurant().getLongitude(),
                order.getCustomer().getLatitude(), order.getCustomer().getLongitude(),
                order.getLines().stream()
                        .map(line -> new Item(line.getItem().getItemId(), line.getItem().getName(), line.getQuantity()))
                        .toList(),
                delivery.courier().getStatus());
    }
}
