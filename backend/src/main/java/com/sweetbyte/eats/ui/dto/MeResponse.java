package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.Operator;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import com.sweetbyte.eats.application.model.User;

//GET /api/auth/me: the logged-in user, shaped by role (the frontend reads "role" to pick a dashboard)
public sealed interface MeResponse permits CustomerMeResponse, RestaurantOwnerMeResponse, CourierMeResponse, OperatorMeResponse {

    static MeResponse from(User user) {
        if (user instanceof Customer customer) return CustomerMeResponse.from(customer);
        if (user instanceof RestaurantOwner owner) return RestaurantOwnerMeResponse.from(owner);
        if (user instanceof Courier courier) return CourierMeResponse.from(courier);
        if (user instanceof Operator operator) return OperatorMeResponse.from(operator);
        throw new UnsupportedOperationException(user.getRole() + " accounts are not supported yet");
    }
}
