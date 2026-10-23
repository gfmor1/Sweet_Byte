package com.sweetbyte.eats.application.permission;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;


@Component
public class OrderPermissionResolver {

    private static final String DENIED = "User does not have permission to perform this action.";

    private final Map<Role, OrderPermissionStrategy> strategies = new EnumMap<>(Role.class); //pairs each role with each corresponding strategy

    public OrderPermissionResolver(List<OrderPermissionStrategy> all_strategies){
        all_strategies.forEach(s -> strategies.put(s.getRole(), s));
    }

    public OrderPermissionStrategy forUser(User user){
        OrderPermissionStrategy strategy = strategies.get(user.getRole()); //finds the strategy for user role
        if(strategy == null) //if no strategies exist for this role yet, throws the exception so no one gets in by default
            throw new PermissionDeniedException(DENIED);
        return strategy;
    }

    public void requireView(User user, Order order){
        if(!forUser(user).canView(user,order)){ //Get the strategy for the user's and check if they can view the order
            throw new PermissionDeniedException("User does not have the permission to view this order.");
        }
    }

    public void requireManage(User user, Order order){
        if(!forUser(user).canManage(user,order)){ //Get the strategy for the user's and check if they can manage the order
            throw new PermissionDeniedException(DENIED);
        }
    }

    public void requireCancel(User user, Order order){ //Get the strategy for the user's and check if they can cancel the order
        if(!forUser(user).canCancel(user,order)){
            throw new PermissionDeniedException("User does not have the permission to cancel this order.");
        }
    }

    public void requireViewRestaurantOrders(User user, Long restaurantId){ //Get the strategy for the user's and check if they can view the restaurant's orders
        if(!forUser(user).canViewRestaurantOrders(user,restaurantId)){
            throw new PermissionDeniedException("User does not have the permission to view this restaurant's orders.");
        }
    }

    public void requireManageRestaurant(User user, Long restaurantId){
        if(!forUser(user).canManageRestaurant(user,restaurantId)){ //Get the strategy for the user's and check if they can view the order
            throw new PermissionDeniedException("Only the restaurant owner or operator can perform this action.");
        }
    }

}
