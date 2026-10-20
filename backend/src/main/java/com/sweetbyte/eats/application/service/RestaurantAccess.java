package com.sweetbyte.eats.application.service;

import org.springframework.stereotype.Component;

import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import com.sweetbyte.eats.application.model.User;

// Shared role rule: managing a restaurant (status, menu, queue) is allowed
// for that restaurant's owner or any operator.
@Component
public class RestaurantAccess {

    public void requireOwnerOrOperator(User user, Long restaurantId) {
        if (user.hasRole(Role.OPERATOR)) return;
        if (user instanceof RestaurantOwner owner
                && owner.getRestaurant().getRestaurantId().equals(restaurantId)) return;
        throw new PermissionDeniedException("Only this restaurant's owner or an operator can do this");
    }
}
