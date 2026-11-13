package com.sweetbyte.eats.application.model;

import com.sweetbyte.eats.application.enums.LedgerEntryType;

import java.math.BigDecimal;
import java.util.List;

public record OrderSummary(Order order, Fare fare, List<LedgerEntry> ledgerEntries) {
    public BigDecimal charged()  { return sum(LedgerEntryType.CHARGE); }
    public BigDecimal refunded() { return sum(LedgerEntryType.REFUND).negate(); }
    public BigDecimal net()      { return charged().subtract(refunded()); }
    private BigDecimal sum(LedgerEntryType t) {
        return ledgerEntries.stream().filter(e -> e.getType() == t)
                .map(LedgerEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}