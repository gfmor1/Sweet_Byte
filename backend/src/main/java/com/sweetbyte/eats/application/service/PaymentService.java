package com.sweetbyte.eats.application.service;

import java.util.List;

import com.sweetbyte.eats.application.model.PaymentEntry;
import com.sweetbyte.eats.application.model.User;

// Payments as recorded by billing (mock payments: no real provider).
// Customer: own payments. Operator: all. Couriers and restaurants: none.
public interface PaymentService {
    List<PaymentEntry> list(User user);
}
