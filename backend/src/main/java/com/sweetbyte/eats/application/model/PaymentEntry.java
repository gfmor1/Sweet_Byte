package com.sweetbyte.eats.application.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// Read model for the Payments tab: one order's PAYMENT billing row, its card (from Order.payment)
// and, if refunded, its REFUND billing row. Not stored; built by PaymentService.
public record PaymentEntry(
        Long paymentId,             // the PAYMENT billing record id
        Long orderId,
        Long customerId,
        String customerName,
        String restaurantName,
        String method,              // null on orders placed before payments were wired
        String brand,
        String last4,
        BigDecimal amount,          // fare total paid
        Instant createdAt,
        UUID reference,
        boolean refunded,
        BigDecimal refundedAmount,  // positive amount returned, null if not refunded
        Instant refundedAt,
        UUID refundReference,
        String refundReason) { }
