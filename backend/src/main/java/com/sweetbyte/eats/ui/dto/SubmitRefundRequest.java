package com.sweetbyte.eats.ui.dto;

// Customer's refund form: { "reason": "..." }
public record SubmitRefundRequest(String reason) {
}
