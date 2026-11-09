package com.sweetbyte.eats.application.model;

import java.time.Instant;
import java.util.Objects;

/**
 * A ready order offered to one courier by the dispatch rule (R-DLV-02),
 * waiting for the courier to accept or decline (UC-DLV-04, UC-DLV-05).
 */
public final class DeliveryOffer {

    private final Long orderId;
    private final Long courierId;
    private final Instant offeredAt;

    public DeliveryOffer(Long orderId, Long courierId, Instant offeredAt) {
        this.orderId = Objects.requireNonNull(orderId, "orderId");
        this.courierId = Objects.requireNonNull(courierId, "courierId");
        this.offeredAt = Objects.requireNonNull(offeredAt, "offeredAt");
    }

    public Long getOrderId() { return orderId; }
    public Long getCourierId() { return courierId; }
    public Instant getOfferedAt() { return offeredAt; }
}