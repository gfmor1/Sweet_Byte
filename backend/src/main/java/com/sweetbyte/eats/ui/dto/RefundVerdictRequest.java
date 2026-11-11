package com.sweetbyte.eats.ui.dto;

// Operator's verdict note: { "note": "..." }. Optional on approve, required on reject.
public record RefundVerdictRequest(String note) {
}
