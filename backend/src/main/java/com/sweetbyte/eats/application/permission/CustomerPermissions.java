package com.sweetbyte.eats.application.permission;

import org.springframework.stereotype.Component;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;

@Component
public class CustomerPermissions implements OrderPermissionStrategy {

    //helper method ownsOrder
    private boolean ownsOrder(User user,Order  order){
        //check the that customer owns the order
        return order.getCustomer().getUserId().equals(user.getUserId());
    }

    //get the role of the user in this case customer
    public Role getRole() {
        return Role.CUSTOMER;
    }

    @Override
    public boolean canView (User user, Order order){
        return ownsOrder(user, order); //checks that the user owns the order
    }

    @Override
    public boolean canManage(User user, Order order){
        return false; //customer can't manage
    }

    @Override
    public boolean canCancel(User user, Order order){
        return ownsOrder(user, order); //checks that the user owns the order
    }

    @Override
    public boolean canViewRestaurantOrders(User user, Long restaurantId){
        return false; //Customer can't view restaurant orders
    }

    @Override
    public boolean canManageRestaurant(User user, Long restaurantId) {
        return false; //Customer can't manage restaurant
    }

}
