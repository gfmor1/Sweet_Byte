package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.model.Courier;

public record CourierResponse(Long id, String name, CourierStatus status, double latitude, double longitude) {
    public static CourierResponse from(Courier courier) {
        return new CourierResponse(courier.getUserId(), courier.getName(), courier.getStatus(),
                courier.getLatitude(), courier.getLongitude());
    }
}
