package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public interface RestaurantService {
    List<Restaurant> getAllRestaurants();

    Restaurant getRestaurantByID(Long restaurantID);

    Restaurant pauseRestaurant(Long RestaurantID);

    Restaurant reOpenRestaurant(Long RestaurantID);

    Restaurant changeStatus(Long RestaurantID, RestaurantStatus status);


    
}
