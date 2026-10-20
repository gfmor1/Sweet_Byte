package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.model.Customer;

public record CustomerMeResponse(Long userId, String name, String email, Role role,
                                 String deliveryAddress) implements MeResponse {
    public static CustomerMeResponse from(Customer customer) {
        return new CustomerMeResponse(customer.getUserId(), customer.getName(), customer.getEmail(),
                customer.getRole(), customer.getDeliveryAddress());
    }
}
