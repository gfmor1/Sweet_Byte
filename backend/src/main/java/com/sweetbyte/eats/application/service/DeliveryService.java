package com.sweetbyte.eats.application.service;

import java.util.List;
import java.util.Optional;

import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.CurrentDelivery;
import com.sweetbyte.eats.application.model.OperatorOverview;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.model.WaitingOrder;

// DLV: courier state, the dispatch rule, handoffs and the dispatch queue.
// The acting courier is always the authenticated user.
public interface DeliveryService {
    Courier getCourier(User user);
    Courier goOnDuty(User user);
    Courier goOffDuty(User user);
    Optional<CurrentDelivery> currentDelivery(User user);
    Courier acceptOffer(User user);
    Courier declineOffer(User user);
    Courier confirmPickup(User user);
    Courier confirmDelivery(User user);

    List<Courier> listCouriers();
    List<WaitingOrder> dispatchQueue(User operator);
    Order reassign(Long orderId, User operator);
    OperatorOverview operatorOverview(User operator);
}
