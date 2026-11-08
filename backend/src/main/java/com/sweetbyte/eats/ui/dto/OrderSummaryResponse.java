package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.OrderLine;
import com.sweetbyte.eats.application.model.OrderSummary;


import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;


public record OrderSummaryResponse (Long orderId, String restaurantName, OrderStatus status, List<Line> lines, FareResponse fare, BigDecimal charged, BigDecimal refunded, BigDecimal net, Map<OrderStatus, Instant> timestamps, List<LedgerEntryResponse> ledger ){
    public record Line(Long menuItemId, String name, Integer quantity,
                       BigDecimal unitPrice, BigDecimal lineTotal) {
        static Line from(OrderLine l) {
            return new Line(l.getItem().getItemId(),
                    l.getItem().getName(),
                    l.getQuantity(),
                    l.getUnitPrice(),      // price frozen when the order was placed
                    l.getLineTotal());     // unitPrice x quantity
        }
    }

    public static OrderSummaryResponse from(OrderSummary summary){
        return new OrderSummaryResponse(summary.order().getOrderId(), summary.order().getRestaurant().getName(), summary.order().getStatus(), summary.order().getLines().stream().map(Line::from).toList(), FareResponse.from(summary.fare()),summary.charged(), summary.refunded(), summary.net(), summary.order().getTimestamps(), summary.ledgerEntries().stream().map(LedgerEntryResponse::from).toList());
    }

}
