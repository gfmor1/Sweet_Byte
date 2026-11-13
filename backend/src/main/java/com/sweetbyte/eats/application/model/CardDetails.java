package com.sweetbyte.eats.application.model;

// The card the customer pays with, as sent at checkout (mock payment).
// Only the safe parts of a card: never the full number or CVV.
public record CardDetails(String brand, String last4, String holder, Integer expMonth, Integer expYear) { }
