package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.application.model.PreparationQueue;
import com.sweetbyte.eats.application.model.Restaurant;


import java.util.List;


public interface RestaurantService {

    //UC II - Browsing (see the restaurants)
    List<Restaurant> getAllRestaurants();

    Restaurant getRestaurantByID(Long restaurantID);

    //UC VII - Rush
    Restaurant pauseRestaurant(Long restaurantID);

    Restaurant reOpenRestaurant(Long restaurantID);

    //UC I - Manage Restaurant Configuration
    Restaurant changeStatus(Long restaurantID, RestaurantStatus status);

    //UC IV - Coordinate Order
    PreparationQueue getPreparationQueue(Long restaurantID);

    void acceptOrder(Long restaurantID, Long orderID);

    void declineOrder(Long restaurantID, Long orderID, String reason);

    void confirmPickup(Long restaurantID, Long orderID, String courierCode);

    //UC VII - Rush
    Long getQueueSize(Long restaurantID);
}
