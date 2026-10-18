package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.PreparationQueue;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
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


    //Constructor (Spring injects both repositories)
    public RestaurantServiceImpl(RestaurantRepository restaurantRepository, OrderRepository orderRepository){
        this.restaurantRepository = restaurantRepository;
        this.orderRepository = orderRepository;
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
    public Restaurant pauseRestaurant(Long restaurantID){
        //Load restaurant by ID from the repository layer
        Restaurant restaurant = getRestaurantByID(restaurantID);
        //Call the pause
        restaurant.pause();
        //Save the restaurant back in the repo layer and return the saved restaurant
        return restaurantRepository.save(restaurant);

    }

    @Override
    public Restaurant reOpenRestaurant(Long restaurantID){

        //Load restaurant by ID from the repo layer
        Restaurant restaurant = getRestaurantByID(restaurantID);
        //Call the open
        restaurant.open();

        //Save the restaurant back in the repo layer and return the saved restaurant
        return restaurantRepository.save(restaurant);


    }

    @Override
    public Restaurant changeStatus(Long restaurantID, RestaurantStatus status){
        //Load restaurant by ID from the repo layer
        Restaurant restaurant = getRestaurantByID(restaurantID);
        //call changeStatus
        restaurant.changeStatus(status);

        //Save the restaurant back in the repo layer and return the saved restaurant
        return restaurantRepository.save(restaurant);

    }

    @Override
    public PreparationQueue getPreparationQueue(Long restaurantID){
        //Load the restaurant (throws NotFound if it doesn't exist)
        Restaurant restaurant = getRestaurantByID(restaurantID);

        //Load all accepted orders of this restaurant, oldest first
        List<Order> acceptedOrders = orderRepository
                .findByRestaurantRestaurantIdAndStatusOrderByArrivalSeqAsc(restaurantID, OrderStatus.ACCEPTED);

        //The queue itself checks that every order belongs here and is ACCEPTED
        return new PreparationQueue(restaurant, acceptedOrders);
    }

    @Override
    public void acceptOrder(Long restaurantID, Long orderID){
        //Load the order and make sure it belongs to this restaurant
        Order order = loadOwnedOrder(restaurantID, orderID);

        //The model enforces PLACED -> ACCEPTED
        order.accept();

        //Save the order back in the repo layer
        orderRepository.save(order);
    }

    @Override
    public void declineOrder(Long restaurantID, Long orderID, String reason){
        //Load the order and make sure it belongs to this restaurant
        Order order = loadOwnedOrder(restaurantID, orderID);

        //The model enforces PLACED -> REJECTED and a non-blank reason
        order.reject(reason);

        //Save the order back in the repo layer
        orderRepository.save(order);
    }

    @Override
    public void confirmPickup(Long restaurantID, Long orderID, String courierCode){
        //TODO: Order has no pickup code field and no READY -> PICKED_UP method yet
        throw new UnsupportedOperationException("confirmPickup not implemented yet");
    }

    @Override
    public Long getQueueSize(Long restaurantID){
        //Make sure the restaurant exists
        getRestaurantByID(restaurantID);

        //Count accepted orders waiting to be prepared
        return orderRepository.countByRestaurantRestaurantIdAndStatus(restaurantID, OrderStatus.ACCEPTED);
    }

    //Load an order by ID and check it belongs to the given restaurant
    private Order loadOwnedOrder(Long restaurantID, Long orderID){
        Order order = orderRepository.findById(orderID)
                .orElseThrow(() -> new NotFoundException("Order not found with ID: " + orderID));
        if (!order.getRestaurant().getRestaurantId().equals(restaurantID)) {
            throw new PermissionDeniedException("Order " + orderID + " does not belong to restaurant " + restaurantID);
        }
        return order;
    }

}
