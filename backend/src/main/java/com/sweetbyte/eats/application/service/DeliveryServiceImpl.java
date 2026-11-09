package com.sweetbyte.eats.application.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.CurrentDelivery;
import com.sweetbyte.eats.application.model.DeliveryOffer;
import com.sweetbyte.eats.application.model.DispatchQueue;
import com.sweetbyte.eats.application.model.OperatorOverview;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.model.WaitingOrder;
import com.sweetbyte.eats.repository.persistence.CourierRepository;
import com.sweetbyte.eats.repository.persistence.OrderRepository;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;

@Service
public class DeliveryServiceImpl implements DeliveryService {

    private static final EnumSet<OrderStatus> HELD_STATUSES = EnumSet.of(OrderStatus.READY, OrderStatus.PICKED_UP);

    private final OrderRepository orderRepository;
    private final CourierRepository courierRepository;
    private final RestaurantRepository restaurantRepository;
    private final EventService eventService;
    private final LedgerService ledgerService;
    private final PricingService pricingService;
    private final TransactionTemplate transaction;

    // Offers and the queue live in memory and are rebuilt from READY orders on startup.
    // One command at a time, so an order can never be bound to two couriers (R-DLV-02).
    private final Object lock = new Object();
    private final DispatchQueue queue = new DispatchQueue();
    private final Map<Long, DeliveryOffer> offersByCourier = new HashMap<>();

    public DeliveryServiceImpl(OrderRepository orderRepository,
                               CourierRepository courierRepository,
                               RestaurantRepository restaurantRepository,
                               EventService eventService,
                               LedgerService ledgerService,
                               PricingService pricingService,
                               PlatformTransactionManager transactionManager) {
        this.orderRepository = orderRepository;
        this.courierRepository = courierRepository;
        this.restaurantRepository = restaurantRepository;
        this.eventService = eventService;
        this.ledgerService = ledgerService;
        this.pricingService = pricingService;
        this.transaction = new TransactionTemplate(transactionManager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    private <T> T command(Supplier<T> action) {
        synchronized (lock) {
            return transaction.execute(status -> action.get());
        }
    }

    // ---- triggers ----
    @EventListener(ApplicationReadyEvent.class)
    public void rebuildQueue() {
        command(() -> {
            orderRepository.findByStatusAndCourierIsNullOrderByReadyAtAsc(OrderStatus.READY)
                    .forEach(order -> queue.enqueue(order.getOrderId(), order.getReadyAt()));
            dispatchWaiting(null);
            return null;
        });
    }

    // R-DLV-01: runs only after the READY status is committed.
    @TransactionalEventListener
    public void onOrderReady(OrderReadyEvent event) {
        command(() -> {
            queue.enqueue(event.orderId(), Instant.now());
            dispatchWaiting(null);
            return null;
        });
    }

    // ---- courier commands ----
    @Override
    public Courier getCourier(User user) {
        return courierOf(user);
    }

    @Override
    public Courier goOnDuty(User user) {
        return command(() -> {
            Courier courier = courierOf(user);
            CourierStatus from = courier.getStatus();
            courier.goOnline();
            // A courier who went offline holding an accepted order resumes it.
            if (heldOrder(courier).isPresent()) courier.assign();
            recordCourier(courier, from, user, null);
            if (courier.isAvailable()) dispatchWaiting(null);
            return courier;
        });
    }

    @Override
    public Courier goOffDuty(User user) {
        return command(() -> {
            Courier courier = courierOf(user);
            if (courier.getStatus() == CourierStatus.CARRYING)
                throw new IllegalStateException("You cannot go off duty while carrying an order");
            CourierStatus from = courier.getStatus();
            // An accepted order stays bound and is stalled until an operator reassigns it.
            boolean stalled = courier.goOffline();
            recordCourier(courier, from, user, stalled ? "Went offline holding an accepted order" : null);
            DeliveryOffer offer = offersByCourier.remove(courier.getUserId());
            if (offer != null) {
                queue.enqueueFirst(offer.getOrderId(), offer.getOfferedAt());
                dispatchWaiting(null);
            }
            return courier;
        });
    }

    @Override
    public Optional<CurrentDelivery> currentDelivery(User user) {
        return command(() -> {
            Courier courier = courierOf(user);
            if (courier.getStatus() == CourierStatus.OFFLINE) return Optional.empty();
            DeliveryOffer offer = offersByCourier.get(courier.getUserId());
            if (offer != null) return Optional.of(new CurrentDelivery(orderDetails(offer.getOrderId()), courier, false));
            return heldOrder(courier).map(order -> new CurrentDelivery(order, courier, true));
        });
    }

    @Override
    public Courier acceptOffer(User user) {
        return command(() -> {
            Courier courier = courierOf(user);
            DeliveryOffer offer = requireOffer(courier, "accept");
            Order order = orderDetails(offer.getOrderId());
            CourierStatus from = courier.getStatus();
            order.assignCourier(courier);
            courier.assign();
            offersByCourier.remove(courier.getUserId());
            recordCourier(courier, from, user, "Accepted order " + order.getOrderId());
            return courier;
        });
    }

    @Override
    public Courier declineOffer(User user) {
        return command(() -> {
            Courier courier = courierOf(user);
            DeliveryOffer offer = requireOffer(courier, "decline");
            offersByCourier.remove(courier.getUserId());
            queue.enqueueFirst(offer.getOrderId(), offer.getOfferedAt());
            recordCourier(courier, courier.getStatus(), user, "Declined order " + offer.getOrderId());
            // Other couriers first; the order waits if this was the only idle one.
            dispatchWaiting(courier.getUserId());
            return courier;
        });
    }

    @Override
    public Courier confirmPickup(User user) {
        return command(() -> {
            Courier courier = courierOf(user);
            if (courier.getStatus() != CourierStatus.ASSIGNED)
                throw new IllegalStateException("You have no assigned order");
            Order order = heldOrder(courier)
                    .orElseThrow(() -> new IllegalStateException("You have no assigned order"));
            OrderStatus orderFrom = order.getStatus();
            order.pickUp(courier);
            courier.pickUp();
            courier.updateLocation(order.getRestaurant().getLatitude(), order.getRestaurant().getLongitude());
            eventService.record("Order", order.getOrderId(), orderFrom, order.getStatus(), user, null);
            recordCourier(courier, CourierStatus.ASSIGNED, user, null);
            return courier;
        });
    }

    @Override
    public Courier confirmDelivery(User user) {
        return command(() -> {
            Courier courier = courierOf(user);
            if (courier.getStatus() != CourierStatus.CARRYING)
                throw new IllegalStateException("You are not carrying an order");
            Order order = heldOrder(courier)
                    .orElseThrow(() -> new IllegalStateException("You are not carrying an order"));
            OrderStatus orderFrom = order.getStatus();
            order.deliver(courier);
            courier.finishDelivery();
            courier.updateLocation(order.getCustomer().getLatitude(), order.getCustomer().getLongitude());
            pricingService.recordFare(order);          // orders placed before billing was wired have none
            ledgerService.recordFinalState(order);
            eventService.record("Order", order.getOrderId(), orderFrom, order.getStatus(), user, null);
            recordCourier(courier, CourierStatus.CARRYING, user, null);
            dispatchWaiting(null);
            return courier;
        });
    }

    // ---- dispatch and operator ----
    @Override
    public List<Courier> listCouriers() {
        return courierRepository.findAll();
    }

    @Override
    public List<WaitingOrder> dispatchQueue(User operator) {
        requireOperator(operator);
        return command(() -> queue.snapshot().entrySet().stream()
                .map(waiting -> new WaitingOrder(orderDetails(waiting.getKey()), waiting.getValue()))
                .toList());
    }

    @Override
    public Order reassign(Long orderId, User operator) {
        requireOperator(operator);
        return command(() -> {
            Order order = orderDetails(orderId);
            if (!order.isStalled())
                throw new IllegalStateException("Only an order whose courier went offline can be reassigned");
            Courier previous = order.getCourier();
            order.unassignCourier();
            previous.releaseAssignment();
            eventService.record("Order", orderId, order.getStatus(), order.getStatus(), operator,
                    "Reassigned from courier " + previous.getUserId());
            queue.enqueueFirst(orderId, Instant.now());
            dispatchWaiting(null);
            return order;
        });
    }

    @Override
    public OperatorOverview operatorOverview(User operator) {
        requireOperator(operator);
        return new OperatorOverview(restaurantRepository.findAll(), orderRepository.findAllByOrderByOrderIdDesc());
    }

    // ---- helpers ----
    // R-DLV-04: oldest first; stops as soon as no courier is left.
    private void dispatchWaiting(Long skipCourierId) {
        for (Long orderId : new ArrayList<>(queue.snapshot().keySet())) {
            Optional<Order> found = orderRepository.findById(orderId);
            if (found.isEmpty() || found.get().getStatus() != OrderStatus.READY || found.get().getCourier() != null) {
                queue.remove(orderId);
                continue;
            }
            Optional<Courier> nearest = nearestIdle(found.get().getRestaurant(), skipCourierId);
            if (nearest.isEmpty()) return;
            Long courierId = nearest.get().getUserId();
            offersByCourier.put(courierId, new DeliveryOffer(found.get(), nearest.get()));
            queue.remove(orderId);
        }
    }

    // The fixed dispatch rule: nearest by straight-line distance, ties to the lowest courier id.
    private Optional<Courier> nearestIdle(Restaurant restaurant, Long skipCourierId) {
        return courierRepository.findByStatus(CourierStatus.IDLE).stream()
                .filter(courier -> !offersByCourier.containsKey(courier.getUserId()))
                .filter(courier -> !courier.getUserId().equals(skipCourierId))
                .min(Comparator.<Courier>comparingDouble(
                                courier -> courier.distanceTo(restaurant.getLatitude(), restaurant.getLongitude()))
                        .thenComparing(Courier::getUserId));
    }

    private DeliveryOffer requireOffer(Courier courier, String action) {
        DeliveryOffer offer = offersByCourier.get(courier.getUserId());
        if (offer == null) throw new IllegalStateException("There is no offer to " + action);
        return offer;
    }

    private Optional<Order> heldOrder(Courier courier) {
        return orderRepository.findByCourierUserIdAndStatusIn(courier.getUserId(), HELD_STATUSES);
    }

    private Order orderDetails(Long orderId) {
        return orderRepository.findWithDeliveryDetailsByOrderId(orderId)
                .orElseThrow(() -> new NotFoundException("Order", orderId));
    }

    private Courier courierOf(User user) {
        if (!user.hasRole(Role.COURIER)) throw new PermissionDeniedException("Only a courier can do this");
        return courierRepository.findById(user.getUserId())
                .orElseThrow(() -> new NotFoundException("Courier", user.getUserId()));
    }

    private void requireOperator(User user) {
        if (!user.hasRole(Role.OPERATOR)) throw new PermissionDeniedException("Only an operator can do this");
    }

    private void recordCourier(Courier courier, CourierStatus from, User user, String note) {
        eventService.record("Courier", courier.getUserId(), from, courier.getStatus(), user, note);
    }
}
