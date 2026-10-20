package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.PreparationQueue;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.repository.persistence.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class RestaurantServiceImpl implements RestaurantService{

    private final RestaurantRepository restaurantRepository;
    private final OrderRepository orderRepository;
    private final RestaurantAccess restaurantAccess;


    //Constructor (Spring injects the repositories and the shared access rule)
    public RestaurantServiceImpl(RestaurantRepository restaurantRepository, OrderRepository orderRepository,
                                 RestaurantAccess restaurantAccess){
        this.restaurantRepository = restaurantRepository;
        this.orderRepository = orderRepository;
        this.restaurantAccess = restaurantAccess;
    }

    //return all the restaurants
    @Override
    public List<Restaurant> getAllRestaurants(){
        return restaurantRepository.findAll();
    }

    //return a restaurant by its ID
    @Override
    public Restaurant getRestaurantByID(Long restaurantID) {
        //Load restaurant by ID from the repository layer
        return restaurantRepository.findById(restaurantID)
                .orElseThrow(() -> new NotFoundException("Restaurant not found with ID: " + restaurantID));
    }

    @Override
    public Restaurant pauseRestaurant(Long restaurantID, User user){
        restaurantAccess.requireOwnerOrOperator(user, restaurantID);
        //Load restaurant by ID from the repository layer
        Restaurant restaurant = getRestaurantByID(restaurantID);
        //Call the pause
        restaurant.pause();
        //Save the restaurant back in the repo layer and return the saved restaurant
        return restaurantRepository.save(restaurant);

    }

    @Override
    public Restaurant reOpenRestaurant(Long restaurantID, User user){
        restaurantAccess.requireOwnerOrOperator(user, restaurantID);

        //Load restaurant by ID from the repo layer
        Restaurant restaurant = getRestaurantByID(restaurantID);
        //Call the open
        restaurant.open();

        //Save the restaurant back in the repo layer and return the saved restaurant
        return restaurantRepository.save(restaurant);


    }

    @Override
    public Restaurant changeStatus(Long restaurantID, RestaurantStatus status, User user){
        restaurantAccess.requireOwnerOrOperator(user, restaurantID);
        //Load restaurant by ID from the repo layer
        Restaurant restaurant = getRestaurantByID(restaurantID);
        //call changeStatus
        restaurant.changeStatus(status);

        //Save the restaurant back in the repo layer and return the saved restaurant
        return restaurantRepository.save(restaurant);

    }

    @Override
    public PreparationQueue getPreparationQueue(Long restaurantID, User user){
        restaurantAccess.requireOwnerOrOperator(user, restaurantID);
        //Load the restaurant (throws NotFound if it doesn't exist)
        Restaurant restaurant = getRestaurantByID(restaurantID);

        //Load all accepted orders of this restaurant, oldest first
        List<Order> acceptedOrders = orderRepository
                .findByRestaurantRestaurantIdAndStatusOrderByArrivalSeqAsc(restaurantID, OrderStatus.ACCEPTED);

        //The queue itself checks that every order belongs here and is ACCEPTED
        return new PreparationQueue(restaurant, acceptedOrders);
    }

    @Override
    public void confirmPickup(Long restaurantID, Long orderID, String courierCode){
        //TODO: Order has no pickup code field and no READY -> PICKED_UP method yet
        throw new UnsupportedOperationException("confirmPickup not implemented yet");
    }

    @Override
    public Long getQueueSize(Long restaurantID, User user){
        restaurantAccess.requireOwnerOrOperator(user, restaurantID);
        //Make sure the restaurant exists
        getRestaurantByID(restaurantID);

        //Count accepted orders waiting to be prepared
        return orderRepository.countByRestaurantRestaurantIdAndStatus(restaurantID, OrderStatus.ACCEPTED);
    }

}
