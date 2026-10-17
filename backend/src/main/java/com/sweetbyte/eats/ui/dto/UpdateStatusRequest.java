package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.enums.OrderStatus;

/**
 * UpdateStatusRequest
 */
public record UpdateStatusRequest(OrderStatus status) {

}
