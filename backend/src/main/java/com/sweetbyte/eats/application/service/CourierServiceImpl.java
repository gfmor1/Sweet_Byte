package com.sweetbyte.eats.application.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.CourierRepository;
import com.sweetbyte.eats.repository.persistence.OrderRepository;

@Service
public class CourierServiceImpl implements CourierService {

    // An order the courier holds: READY = assigned, PICKED_UP = carrying
    private static final List<OrderStatus> HELD = List.of(OrderStatus.READY, OrderStatus.PICKED_UP);
    private final CourierRepository courierRepository;
    private final OrderRepository orderRepository;
    private final DispatchService dispatchService;
    private final EventService eventService;
    private final PricingService pricingService;
    private final LedgerService ledgerService;

    public CourierServiceImpl(CourierRepository courierRepository,
                              OrderRepository orderRepository,
                              DispatchService dispatchService,
                              EventService eventService,
                              PricingService pricingService,
                              LedgerService ledgerService) {
        this.courierRepository = courierRepository;
        this.orderRepository = orderRepository;
        this.dispatchService = dispatchService;
        this.eventService = eventService;
        this.pricingService = pricingService;
        this.ledgerService = ledgerService;
    }

    @Override
    @Transactional(readOnly = true)
    public Courier getMe(User user) {
        return requireCourier(user);
    }

    @Override
    @Transactional
    public Courier goOnDuty(User user, double latitude, double longitude) {
        Courier courier = requireCourier(user);
        courier.goOnline();                                      // OFFLINE -> IDLE, throws otherwise
        courier.updateLocation(latitude, longitude);             // fresh position before dispatch sees it
        courierRepository.save(courier);
        eventService.record("Courier", courier.getUserId(), CourierStatus.OFFLINE, CourierStatus.IDLE, user, null);
        dispatchService.retryQueue(user);                        // R-DLV-04: a courier became idle
        return courier;
    }

    @Override
    @Transactional
    public Courier goOffDuty(User user) {
        Courier courier = requireCourier(user);
        CourierStatus from = courier.getStatus();
        dispatchService.withdrawPendingOffer(courier, user);    // an unanswered offer goes back to the queue
        boolean leftAnOrder = courier.goOffline();              // refused while CARRYING (R-DLV-03)
        courierRepository.save(courier);
        String note = null;
        if (leftAnOrder) {
            // the order keeps this courier until an operator reassigns it (R-DLV-02)
            note = orderRepository.findFirstByCourierUserIdAndStatusIn(courier.getUserId(), HELD)
                    .map(o -> "Order " + o.getOrderId() + " stalled, waiting for operator reassign")
                    .orElse(null);
        }
        eventService.record("Courier", courier.getUserId(), from, CourierStatus.OFFLINE, user, note);
        dispatchService.retryQueue(user);                       // re-offer a withdrawn order to someone else
        return courier;
    }

    @Override
    @Transactional
    public Courier updateLocation(User user, double latitude, double longitude) {
        Courier courier = requireCourier(user);
        courier.updateLocation(latitude, longitude);
        return courierRepository.save(courier);
    }

    @Override
    @Transactional
    public Order confirmPickup(Long orderId, User user) {
        Courier courier = requireCourier(user);
        Order order = findOrder(orderId);
        order.pickUp(courier);
        courier.pickUp();
        // simulated position: the courier is now at the restaurant
        courier.updateLocation(order.getRestaurant().getLatitude(), order.getRestaurant().getLongitude());
        courierRepository.save(courier);
        Order saved = orderRepository.save(order);
        eventService.record("Order", orderId, OrderStatus.READY, OrderStatus.PICKED_UP, user, null);
        eventService.record("Courier", courier.getUserId(), CourierStatus.ASSIGNED, CourierStatus.CARRYING, user,
                "Order " + orderId);
        return saved;
    }

    @Override
    @Transactional
    public Order confirmDelivery(Long orderId, User user) {
        Courier courier = requireCourier(user);
        Order order = findOrder(orderId);
        order.deliver(courier);
        courier.finishDelivery();
        // simulated position: the courier is now at the drop-off
        courier.updateLocation(order.getCustomer().getLatitude(), order.getCustomer().getLongitude());
        courierRepository.save(courier);
        Order saved = orderRepository.save(order);
        pricingService.recordFare(saved);           // idempotent; orders placed before billing was wired have none
        ledgerService.recordFinalState(saved);
        eventService.record("Order", orderId, OrderStatus.PICKED_UP, OrderStatus.DELIVERED, user, null);
        eventService.record("Courier", courier.getUserId(), CourierStatus.CARRYING, CourierStatus.IDLE, user,
                "Order " + orderId);
        dispatchService.retryQueue(user);
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Order> getActiveDelivery(User user) {
        Courier courier = requireCourier(user);
        return orderRepository.findByCourierUserIdAndStatusIn(courier.getUserId(), HELD);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Courier> listCouriers() {
        return courierRepository.findAll();
    }

    private Courier requireCourier(User user) {
        if (!user.hasRole(Role.COURIER)) {
            throw new PermissionDeniedException("Only a courier can do this");
        }
        return courierRepository.findById(user.getUserId())
                .orElseThrow(() -> new NotFoundException("Courier", user.getUserId()));
    }

    private Order findOrder(Long orderId) {
        // with the customer: delivery reads the drop-off position
        return orderRepository.findWithDeliveryDetailsByOrderId(orderId)
                .orElseThrow(() -> new NotFoundException("Order", orderId));
    }
}