package com.sweetbyte.eats.application.permission;

import org.springframework.stereotype.Component;

import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import com.sweetbyte.eats.application.model.User;

@Component
public class RestaurantOwnerPermissions implements OrderPermissionStrategy {

    //helper method
    private boolean ownsRestaurant(User user, Long restaurantId){
        //check the user is a restaurant owner and check that it owns the restaurant
        return user instanceof RestaurantOwner owner && owner
                .getRestaurant().getRestaurantId().equals(restaurantId);
    }

    @Override
    public Role getRole(){
        return Role.RESTAURANT_OWNER;
    }

    @Override
    public boolean canView(User user, Order order){
        //The restaurant owner can check an order
        return ownsRestaurant(user, order.getRestaurant().getRestaurantId());
    }

    @Override
    public boolean canManage(User user, Order order){
        //The restaurant can manage the restaurant
        return ownsRestaurant(user, order.getRestaurant().getRestaurantId());
    }

    @Override
    public boolean canCancel(User user, Order order){
        return false; //Owner can't cancel the order of the customer
    }

    @Override
    public boolean canViewRestaurantOrders(User user, Long restaurantId){
        //the owner can check the list of orders in the restaurant
        return ownsRestaurant(user, restaurantId);
    }

    @Override
    public boolean canManageRestaurant(User user, Long restaurantId){
        return ownsRestaurant(user, restaurantId); // checks if owner of the restaurant if yes can manage the restaurant
    }

}
