package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.model.PreparationQueue;
import com.sweetbyte.eats.application.enums.OrderStatus;
import java.util.List;


public record QueueResponse(Long restaurantID, List<QueuedOrder> orders) {
    public record QueuedOrder(Long orderID, Long arrivalSeq, OrderStatus status){}

    public static QueueResponse from(PreparationQueue prepqueue){
        return new QueueResponse(prepqueue.getRestaurant().getRestaurantId(), prepqueue.getOrders().stream()
                .map(o -> new QueuedOrder(o.getOrderId(), o.getArrivalSeq(), o.getStatus())).toList());
    }
}