package com.sweetbyte.eats.ui.dto;

import java.util.List;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Restaurant;

// The order a courier holds (accepted or carrying): where to pick it up, where to bring it.
// Never carries customer payment information.
public record ActiveDeliveryResponse(
        Long orderId,
        OrderStatus status,
        Long restaurantId,
        String restaurantName,
        double restaurantLatitude,
        double restaurantLongitude,
        String deliveryAddress,
        Double customerLatitude,     // the order's delivery coordinates (null on legacy orders)
        Double customerLongitude,
        List<OrderResponse.Line> items) {

    public static ActiveDeliveryResponse from(Order order) {
        Restaurant restaurant = order.getRestaurant();
        return new ActiveDeliveryResponse(
                order.getOrderId(),
                order.getStatus(),
                restaurant.getRestaurantId(),
                restaurant.getName(),
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                order.getDeliveryAddress(),
                order.getDeliveryLatitude(),
                order.getDeliveryLongitude(),
                order.getLines().stream().map(OrderResponse.Line::from).toList());
    }
}
