package com.sweetbyte.eats.application.permission;

import org.springframework.stereotype.Component;

import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;

// Platform operator: administrative oversight of every restaurant and order (Appendix A, R-DASH-01).
// Sees everything, but never prepares or delivers orders.
@Component
public class OperatorPermissions implements OrderPermissionStrategy {

    @Override
    public Role getRole() {
        return Role.OPERATOR;
    }

    @Override
    public boolean canView(User user, Order order) {
        return true; // operator views all orders
    }

    @Override
    public boolean canManage(User user, Order order) {
        return false; // accept / reject / prepare / ready are restaurant actions; operator cannot prepare orders
    }

    @Override
    public boolean canCancel(User user, Order order) {
        return true; // after PLACED, cancellation is an operator action (ORD "Cancel")
    }

    @Override
    public boolean canViewRestaurantOrders(User user, Long restaurantId) {
        return true; // any restaurant's orders and queue
    }

    @Override
    public boolean canManageRestaurant(User user, Long restaurantId) {
        return true; // pause or reopen any restaurant
    }
}
