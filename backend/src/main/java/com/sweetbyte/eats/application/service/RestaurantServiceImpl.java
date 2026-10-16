package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class RestaurantServiceImpl implements RestaurantService{

    private final RestaurantRepository restaurantRepository;


    //Constructor
    public RestaurantServiceImpl(RestaurantRepository restaurantRepository){
        this.restaurantRepository = restaurantRepository;
    }

    //return all the restaurants
    public List<Restaurant> getAllRestaurants(){
        return restaurantRepository.findAll();
    }

    //return a restaurant by its ID
    public Restaurant getRestaurantByID(Long restaurantID) {
        //Load restaurant by ID from the repository layer
        return restaurantRepository.findById(restaurantID)
                .orElseThrow(() -> new NotFoundException("Restaurant not found with ID: " + restaurantID));
    }

    public Restaurant pauseRestaurant(Long restaurantID){
        //Load restaurant by ID from the repository layer
        Restaurant restaurant = restaurantRepository.findById(restaurantID)
                .orElseThrow(() -> new NotFoundException("Restaurant not found with ID: " + restaurantID));
        //Call the pause
        restaurant.pause();
        //Save the restaurant back in the repo layer and return the saved restaurant
        return restaurantRepository.save(restaurant);

    }

    public Restaurant reOpenRestaurant(Long restaurantID){

        //Load restaurant by ID from the repo layer
        Restaurant restaurant = restaurantRepository.findById(restaurantID)
                .orElseThrow(() -> new NotFoundException("Restaurant not found with ID: " + restaurantID));
        //Call the open
        restaurant.open();

        //Save the restaurant back in the repo layer and return the saved restaurant
        return restaurantRepository.save(restaurant);


    }

    public Restaurant changeStatus(Long restaurantID, RestaurantStatus status){
        //Load restaurant by ID from the repo layer
        Restaurant restaurant = restaurantRepository.findById(restaurantID)
                .orElseThrow(() -> new NotFoundException("Restaurant not found with ID: " + restaurantID));

        //call changeStatus
        restaurant.changeStatus(status);

        //Save the restaurant back in the repo layer and return the saved restaurant
        return restaurantRepository.save(restaurant);

    }


}
