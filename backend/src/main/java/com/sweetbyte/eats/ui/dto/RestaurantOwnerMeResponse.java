package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.model.RestaurantOwner;

//restaurantId tells the frontend which restaurant dashboard to load
public record RestaurantOwnerMeResponse(Long userId, String name, String email, Role role,
                                        Long restaurantId, String restaurantName) implements MeResponse {
    public static RestaurantOwnerMeResponse from(RestaurantOwner owner) {
        return new RestaurantOwnerMeResponse(owner.getUserId(), owner.getName(), owner.getEmail(),
                owner.getRole(), owner.getRestaurant().getRestaurantId(), owner.getRestaurant().getName());
    }
}
