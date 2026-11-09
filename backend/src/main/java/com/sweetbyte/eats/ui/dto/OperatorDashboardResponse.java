package com.sweetbyte.eats.ui.dto;

import java.util.EnumSet;
import java.util.List;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.application.model.OperatorOverview;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Restaurant;

//GET /api/operator/dashboard: every restaurant and order, with the stalled flag
public record OperatorDashboardResponse(List<RestaurantRow> restaurants, List<OrderRow> orders) {
    private static final EnumSet<OrderStatus> QUEUED = EnumSet.of(OrderStatus.ACCEPTED, OrderStatus.PREPARING);

    public record RestaurantRow(Long id, String name, RestaurantStatus status,
                                double latitude, double longitude, long queueSize) {
    }

    public record Item(Long id, String name, Integer quantity) {
    }

    public record OrderRow(Long id, Long restaurantId, String restaurantName, String customerName,
                           OrderStatus status, Long courierId, String reason, List<Item> items,
                           boolean canReassign) {
        public static OrderRow from(Order order) {
            return new OrderRow(order.getOrderId(), order.getRestaurant().getRestaurantId(),
                    order.getRestaurant().getName(), order.getCustomer().getName(), order.getStatus(),
                    order.getCourier() == null ? null : order.getCourier().getUserId(),
                    order.getRejectionReason(),
                    order.getLines().stream()
                            .map(line -> new Item(line.getItem().getItemId(), line.getItem().getName(), line.getQuantity()))
                            .toList(),
                    order.isStalled());
        }
    }

    public static OperatorDashboardResponse from(OperatorOverview overview) {
        return new OperatorDashboardResponse(
                overview.restaurants().stream().map(r -> row(r, overview.orders())).toList(),
                overview.orders().stream().map(OrderRow::from).toList());
    }

    private static RestaurantRow row(Restaurant restaurant, List<Order> orders) {
        long queued = orders.stream()
                .filter(o -> o.getRestaurant().getRestaurantId().equals(restaurant.getRestaurantId()))
                .filter(o -> QUEUED.contains(o.getStatus()))
                .count();
        return new RestaurantRow(restaurant.getRestaurantId(), restaurant.getName(), restaurant.getStatus(),
                restaurant.getLatitude(), restaurant.getLongitude(), queued);
    }
}
