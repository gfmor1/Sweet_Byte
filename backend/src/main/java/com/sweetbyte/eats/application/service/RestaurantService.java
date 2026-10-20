package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.model.User;

import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.application.model.PreparationQueue;
import com.sweetbyte.eats.application.model.Restaurant;


import java.util.List;


public interface RestaurantService {

    //UC II - Browsing (see the restaurants)
    List<Restaurant> getAllRestaurants();

    Restaurant getRestaurantByID(Long restaurantID);

    //UC VII - Rush
    Restaurant pauseRestaurant(Long restaurantID, User user);

    Restaurant reOpenRestaurant(Long restaurantID, User user);

    //UC I - Manage Restaurant Configuration
    Restaurant changeStatus(Long restaurantID, RestaurantStatus status, User user);

    //UC IV - Coordinate Order
    PreparationQueue getPreparationQueue(Long restaurantID, User user);


    // accept / decline live in OrderService (PATCH /api/orders/{id}/status, POST /api/orders/{id}/reject)

    void confirmPickup(Long restaurantID, Long orderID, String courierCode);

    //UC VII - Rush
    Long getQueueSize(Long restaurantID, User user);
}
