package com.sweetbyte.eats.ui.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.OrderLine;
import com.sweetbyte.eats.application.model.Payment;

//id, restaurant, status, lines, timestamps
public record OrderResponse(Long orderId,
        Long restaurantId,
        String restaurantName,
        OrderStatus status,
        List<Line> lines,
        Instant placedAt,
        Instant acceptedAt,
        Instant readyAt,
        Instant deliveredAt,
        String reason,
        Long courierId,
        String courierName,
        CourierStatus courierStatus,
        Double courierLatitude,
        Double courierLongitude,
        String deliveryAddress,
        Double latitude,             // delivery coordinates chosen at checkout
        Double longitude,
        PaymentSummary payment) {    // null on orders placed before payments were wired

    // Safe card summary only (no holder/expiry). Never sent to couriers (they get other DTOs).
    public record PaymentSummary(String method, String brand, String last4,
                                 BigDecimal amount, Instant paidAt, UUID reference) {
        static PaymentSummary from(Payment p) {
            return p == null ? null : new PaymentSummary(p.getMethod(), p.getCardBrand(),
                    p.getCardLast4(), p.getAmount(), p.getPaidAt(), p.getReference());
        }
    }

    public record Line(Long menuItemId, String name, Integer quantity) {
        static Line from(OrderLine line) {
            return new Line(line.getItem().getItemId(),
                    line.getItem().getName(),
                    line.getQuantity());
        }
    }

    public static OrderResponse from (Order order) {
        Courier courier = order.getCourier();
        return new OrderResponse(order.getOrderId(),
                order.getRestaurant().getRestaurantId(),
                order.getRestaurant().getName(),
                order.getStatus(),
                order.getLines().stream().map(Line::from).toList(),
                order.getPlacedAt(),
                order.getAcceptedAt(),
                order.getReadyAt(),
                order.getDeliveredAt(),
                order.getRejectionReason(),
                courier == null ? null : courier.getUserId(),
                courier == null ? null : courier.getName(),
                courier == null ? null : courier.getStatus(),
                courier == null ? null : courier.getLatitude(),
                courier == null ? null : courier.getLongitude(),
                order.getDeliveryAddress(),
                order.getDeliveryLatitude(),
                order.getDeliveryLongitude(),
                PaymentSummary.from(order.getPayment())
        );
    }
}
