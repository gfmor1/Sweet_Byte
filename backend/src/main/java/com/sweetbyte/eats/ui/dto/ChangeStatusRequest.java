package com.sweetbyte.eats.ui.dto;
import com.sweetbyte.eats.application.enums.RestaurantStatus;

public record ChangeStatusRequest(RestaurantStatus status) {
}
