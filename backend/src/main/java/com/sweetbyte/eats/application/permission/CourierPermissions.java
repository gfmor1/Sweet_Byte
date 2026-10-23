package com.sweetbyte.eats.application.permission;

import org.springframework.stereotype.Component;

import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Courier;


@Component
public class CourierPermissions implements OrderPermissionStrategy{

    @Override
    public Role getRole(){
        return Role.COURIER;
    }

    @Override
    public boolean canView(User user, Order order){
        //courier can view an order if he is assigned to it
        return order.getCourier() != null
                && order.getCourier().getUserId().equals(user.getUserId());
    }

    @Override
    public boolean canManage(User user, Order order){
        return false; //Courier can't manage
    }

    @Override
    public boolean canCancel(User user, Order order){
        return false; //Courier can't cancel the customer's order
    }

    @Override
    public boolean canViewRestaurantOrders(User user, Long restaurantId){
        return false; //The courier does not have the permission to check the restaurant's orders.
    }

    @Override
    public boolean canManageRestaurant(User user, Long restaurantId){
        return false; //The courier can't manage the restaurant
    }
}
