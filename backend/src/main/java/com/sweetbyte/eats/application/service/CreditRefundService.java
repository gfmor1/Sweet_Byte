package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.model.BillingRecord;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;

// Automatic Credit Refund: (mock) returns the full fare to the customer and updates the ledger.
// Internal only, no endpoint. Called by:
//   1. RefundRequestService  (operator approves a customer's refund request, order DELIVERED)
//   2. OrderService.cancelOrder  (order CANCELLED)
//   3. OrderService.rejectOrder  (restaurant rejects, order REJECTED)
public interface CreditRefundService {
    BillingRecord refund(Order order, String reason, User actor);
}
