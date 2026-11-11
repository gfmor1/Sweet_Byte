package com.sweetbyte.eats.ui.dto;

import java.time.Instant;

import com.sweetbyte.eats.application.enums.RefundRequestStatus;
import com.sweetbyte.eats.application.model.RefundRequest;

public record RefundRequestResponse(Long requestId, Long orderId, Long customerId, Long restaurantId,
                                    String reason, RefundRequestStatus status, Instant requestedAt,
                                    Instant decidedAt, Long decidedBy, String operatorNote) {

    public static RefundRequestResponse from(RefundRequest r) {
        return new RefundRequestResponse(r.getRequestId(), r.getOrderId(), r.getCustomerId(),
                r.getRestaurantId(), r.getReason(), r.getStatus(), r.getRequestedAt(),
                r.getDecidedAt(), r.getDecidedBy(), r.getOperatorNote());
    }
}
