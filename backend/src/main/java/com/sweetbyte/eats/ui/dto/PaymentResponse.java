package com.sweetbyte.eats.ui.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.sweetbyte.eats.application.model.PaymentEntry;

// GET /api/payments. Same shape the frontend Payments tab already uses.
// Card: brand + last 4 only. Never sent to couriers.
public record PaymentResponse(Long paymentId, Long orderId, Long customerId, String customerName,
                              String restaurantName, String method, String brand, String last4,
                              BigDecimal amount, String currency, String status,
                              Instant createdAt, UUID reference,
                              BigDecimal refundedAmount, Instant refundedAt, UUID refundReference,
                              String refundReason) {

    public static PaymentResponse from(PaymentEntry e) {
        return new PaymentResponse(e.paymentId(), e.orderId(), e.customerId(), e.customerName(),
                e.restaurantName(), e.method(), e.brand(), e.last4(),
                e.amount(), "CAD", e.refunded() ? "REFUNDED" : "PAID",
                e.createdAt(), e.reference(),
                e.refundedAmount(), e.refundedAt(), e.refundReference(), e.refundReason());
    }
}
