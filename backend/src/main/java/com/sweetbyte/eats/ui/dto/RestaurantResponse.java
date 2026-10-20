package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.application.model.Restaurant;

public record RestaurantResponse(Long restaurantID, String name, RestaurantStatus status, double latitude, double longitude) {
    public static RestaurantResponse from(Restaurant restaurant){
        return new RestaurantResponse(restaurant.getRestaurantId(), restaurant.getName(), restaurant.getStatus(), restaurant.getLatitude(), restaurant.getLongitude());
    }
}
