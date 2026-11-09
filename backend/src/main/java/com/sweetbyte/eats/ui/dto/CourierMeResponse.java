package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.model.Courier;

public record CourierMeResponse(Long userId, String name, String email, Role role,
                                CourierStatus status, double latitude, double longitude) implements MeResponse {
    public static CourierMeResponse from(Courier courier) {
        return new CourierMeResponse(courier.getUserId(), courier.getName(), courier.getEmail(),
                courier.getRole(), courier.getStatus(), courier.getLatitude(), courier.getLongitude());
    }
}
