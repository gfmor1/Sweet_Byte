package com.sweetbyte.eats.application.service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.dispatch.DispatchRule;
import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.OfferStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.DeliveryOffer;
import com.sweetbyte.eats.application.model.OperatorOverview;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.CourierRepository;
import com.sweetbyte.eats.repository.persistence.DeliveryOfferRepository;
import com.sweetbyte.eats.repository.persistence.OrderRepository;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;

@Service
public class DispatchServiceImpl implements DispatchService {

    private final OrderRepository orderRepository;
    private final CourierRepository courierRepository;
    private final DeliveryOfferRepository offerRepository;
    private final DispatchRule dispatchRule;
    private final EventService eventService;
    private final RestaurantRepository restaurantRepository;

    public DispatchServiceImpl(OrderRepository orderRepository,
                               CourierRepository courierRepository,
                               DeliveryOfferRepository offerRepository,
                               DispatchRule dispatchRule,
                               EventService eventService,
                               RestaurantRepository restaurantRepository) {
        this.orderRepository = orderRepository;
        this.courierRepository = courierRepository;
        this.offerRepository = offerRepository;
        this.dispatchRule = dispatchRule;
        this.eventService = eventService;
        this.restaurantRepository = restaurantRepository;
    }
 
    @Override
    @Transactional
    public void onOrderReady(Order order, User actor) {
        if (!tryOffer(order, actor)) {
            // R-DLV-04: never silently dropped, it waits in the queue
            eventService.record("Order", order.getOrderId(), OrderStatus.READY, OrderStatus.READY,
                    actor, "Queued: no available courier");
        }
    }

    @Override
    @Transactional
    public void retryQueue(User actor) { 
        for (Order queued : orderRepository.findByStatusAndCourierIsNullOrderByReadyAtAscArrivalSeqAsc(OrderStatus.READY)) {
            if (courierRepository.findByStatus(CourierStatus.IDLE).isEmpty()) {
                return;
            }
            tryOffer(queued, actor);
        }
    }

    private boolean tryOffer(Order order, User actor) {
        if (order.getStatus() != OrderStatus.READY || order.getCourier() != null) {
            return false;
        }
        if (offerRepository.findFirstByOrderOrderIdAndStatus(order.getOrderId(), OfferStatus.PENDING).isPresent()) {
            return true;
        }

        Set<Long> excluded = new HashSet<>();
        for (DeliveryOffer past : offerRepository.findByOrderOrderId(order.getOrderId())) {
            if (past.getStatus() == OfferStatus.DECLINED || past.getStatus() == OfferStatus.ACCEPTED) {
                excluded.add(past.getCourier().getUserId());
            }
        }
        for (DeliveryOffer pending : offerRepository.findByStatus(OfferStatus.PENDING)) {
            excluded.add(pending.getCourier().getUserId());
        }
        List<Courier> candidates = courierRepository.findByStatus(CourierStatus.IDLE).stream()
                .filter(c -> !excluded.contains(c.getUserId()))
                .toList();
        Optional<Courier> chosen = dispatchRule.select(order.getRestaurant(), candidates);
        if (chosen.isEmpty()) {
            return false;
        }
        DeliveryOffer offer = offerRepository.save(new DeliveryOffer(order, chosen.get()));
        eventService.record("DeliveryOffer", offer.getOfferId(), null, OfferStatus.PENDING, actor,
                "Order " + order.getOrderId() + " offered to courier " + chosen.get().getUserId());
        return true;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<DeliveryOffer> getCurrentOffer(User user) {
        Courier courier = requireCourier(user);
        return offerRepository.findFirstByCourierUserIdAndStatus(courier.getUserId(), OfferStatus.PENDING);
    }

    @Override
    @Transactional
    public Order acceptOffer(Long orderId, User user) {
        Courier courier = requireCourier(user); 
        DeliveryOffer offer = findPendingOffer(courier, orderId);
        Order order = offer.getOrder();
        offer.accept();
        order.assignCourier(courier);
        courier.assign();
        offerRepository.save(offer);
        courierRepository.save(courier);
        Order saved = orderRepository.save(order);
        eventService.record("DeliveryOffer", offer.getOfferId(), OfferStatus.PENDING, OfferStatus.ACCEPTED, user, null);
        eventService.record("Courier", courier.getUserId(), CourierStatus.IDLE, CourierStatus.ASSIGNED, user,
                "Order " + orderId);
        return saved;
    }

    @Override
    @Transactional
    public void declineOffer(Long orderId, User user) {
        Courier courier = requireCourier(user);
        DeliveryOffer offer = findPendingOffer(courier, orderId);

        offer.decline();
        offerRepository.save(offer);
        eventService.record("DeliveryOffer", offer.getOfferId(), OfferStatus.PENDING, OfferStatus.DECLINED, user, null);
        // the order goes back to the queue + is offered to the next nearest courier;
        // courier is still idle, so he can receive another queued order
        retryQueue(user);
    }

    @Override
    @Transactional
    public void withdrawPendingOffer(Courier courier, User actor) {
        offerRepository.findFirstByCourierUserIdAndStatus(courier.getUserId(), OfferStatus.PENDING)
                .ifPresent(offer -> {
                    offer.withdraw();
                    offerRepository.save(offer);
                    eventService.record("DeliveryOffer", offer.getOfferId(), OfferStatus.PENDING,
                            OfferStatus.WITHDRAWN, actor, "Courier went off duty");
                });
    }

    @Override
    @Transactional(readOnly = true)
    public List<Order> getQueue(User user) {
        requireOperator(user);
        return orderRepository.findByStatusAndCourierIsNullOrderByReadyAtAscArrivalSeqAsc(OrderStatus.READY);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Order> getStalledOrders(User user) {
        requireOperator(user);
        return orderRepository.findByStatusAndCourier_Status(OrderStatus.READY, CourierStatus.OFFLINE);
    }

    // R-DLV-02: an accepted order changes courier only by operator command,
    // and only before pickup (Order.unassignCourier checks it).
    @Override
    @Transactional
    public Order reassign(Long orderId, User user) {
        requireOperator(user);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order", orderId));
        Courier previous = order.getCourier();
        if (previous == null) {
            throw new IllegalStateException("Order " + orderId + " has no courier to reassign");
        }
        CourierStatus from = previous.getStatus();

        order.unassignCourier();
        previous.releaseAssignment();
        courierRepository.save(previous);
        Order saved = orderRepository.save(order);

        eventService.record("Courier", previous.getUserId(), from, previous.getStatus(), user,
                "Released from order " + orderId + " by operator");
        tryOffer(saved, user);
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public OperatorOverview getOverview(User user) {
        requireOperator(user);
        return new OperatorOverview(restaurantRepository.findAll(), orderRepository.findAllByOrderByOrderIdDesc());
    }

    private DeliveryOffer findPendingOffer(Courier courier, Long orderId) {
        return offerRepository.findFirstByCourierUserIdAndStatus(courier.getUserId(), OfferStatus.PENDING)
                .filter(o -> o.getOrder().getOrderId().equals(orderId))
                .orElseThrow(() -> new NotFoundException("Pending offer for order", orderId));
    }

    // Reloads the courier in this transaction, so its changes are tracked and saved.
    private Courier requireCourier(User user) {
        if (!user.hasRole(Role.COURIER)) {
            throw new PermissionDeniedException("Only a courier can do this");
        }
        return courierRepository.findById(user.getUserId())
                .orElseThrow(() -> new NotFoundException("Courier", user.getUserId()));
    }

    private void requireOperator(User user) {
        if (!user.hasRole(Role.OPERATOR)) {
            throw new PermissionDeniedException("Only an operator can do this");
        }
    }
}