package com.sweetbyte.eats.ui.dto;

import java.time.Instant;
import java.util.List;

import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.DeliveryOffer;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Restaurant;

// What a courier sees when an order is offered: where to pick it up, where to bring it.
public record DeliveryOfferResponse(
        Long offerId,
        Long orderId,
        String restaurantName,
        double restaurantLatitude,
        double restaurantLongitude,
        String deliveryAddress,
        double customerLatitude,
        double customerLongitude,
        List<OrderResponse.Line> items,
        Instant offeredAt) {

    public static DeliveryOfferResponse from(DeliveryOffer offer) {
        Order order = offer.getOrder();
        Restaurant restaurant = order.getRestaurant();
        Customer customer = order.getCustomer();
        return new DeliveryOfferResponse(
                offer.getOfferId(),
                order.getOrderId(),
                restaurant.getName(),
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                customer.getDeliveryAddress(),
                customer.getLatitude(),
                customer.getLongitude(),
                order.getLines().stream().map(OrderResponse.Line::from).toList(),
                offer.getOfferedAt());
    }
}