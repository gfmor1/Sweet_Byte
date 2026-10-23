package com.sweetbyte.eats.application.permission;

import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.enums.Role;


public interface OrderPermissionStrategy {

    Role getRole();

    boolean canView(User user, Order order);

    boolean canManage(User user, Order order);

    boolean canCancel(User user, Order order);

    boolean canViewRestaurantOrders(User user, Long restaurantId);

    boolean canManageRestaurant(User user, Long restaurantId);
}
