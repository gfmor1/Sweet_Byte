package com.sweetbyte.eats.application.service;

import java.util.List;

import com.sweetbyte.eats.application.model.RefundRequest;
import com.sweetbyte.eats.application.model.User;

// Refund Request module: customer submits, operator decides, approval triggers the Automatic Credit Refund.
public interface RefundRequestService {
    RefundRequest submit(Long orderId, String reason, User user);       // customer, within the refund window
    RefundRequest approve(Long requestId, String note, User user);      // operator -> CreditRefundService
    RefundRequest reject(Long requestId, String note, User user);       // operator, note required
    List<RefundRequest> pending(User user);                             // operator queue
    List<RefundRequest> list(User user);                                // role-scoped (customer / restaurant / operator)
    RefundRequest getForOrder(Long orderId, User user);                 // verdict for one order
}
