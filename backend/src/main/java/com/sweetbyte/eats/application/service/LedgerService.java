package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.model.LedgerEntry;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;

import java.util.List;

public interface LedgerService {

    LedgerEntry recordFinalState(Order order); //UC II record order state in ledger
    LedgerEntry refund(long orderId, String reason, User user); //UC V Operator issues refund
    List<LedgerEntry> history(User user); //UC IV order history (role-scoped)
    List<LedgerEntry> entriesFor(Long orderId);
 }
