package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.enums.LedgerEntryType;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.LedgerEntry;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record LedgerEntryResponse(UUID id, LedgerEntryType type, Long orderId, Long customerId, Long restaurantId, Long courierId, OrderStatus finalStatus, Map<OrderStatus, Instant> timestamps, BigDecimal amount, Instant recordedAt, UUID refundOfEntryId, String reason) {

    public static LedgerEntryResponse from(LedgerEntry entry){
        return new LedgerEntryResponse(entry.getId(),entry.getType(), entry.getOrderId(), entry.getCustomerId(), entry.getRestaurantId(), entry.getCourierId(), entry.getFinalStatus(), entry.getTimestamps(), entry.getAmount(), entry.getRecordedAt(), entry.getRefundOfEntryId(), entry.getReason());
    }

}
