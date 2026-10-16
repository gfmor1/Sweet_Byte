package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.application.model.PreparationQueue;
import com.sweetbyte.eats.application.model.Restaurant;


import java.util.List;


public interface RestaurantService {
    List<Restaurant> getAllRestaurants();

    Restaurant getRestaurantByID(Long restaurantID);

    Restaurant pauseRestaurant(Long restaurantID);

    Restaurant reOpenRestaurant(Long restaurantID);

    Restaurant changeStatus(Long restaurantID, RestaurantStatus status);

    PreparationQueue getPreparationQueue(Long restaurantID);

    void acceptOrder(Long restaurantID, Long orderID);

    void declineOrder(Long restaurantID, Long orderID, String reason);

    void confirmPickup(Long restaurantID, Long orderID, String courierCode);

    int getQueueSize(Long restaurantID);
}
