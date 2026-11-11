package com.sweetbyte.eats.application.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.enums.RefundRequestStatus;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.RefundRequest;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.OrderRepository;
import com.sweetbyte.eats.repository.persistence.RefundRequestRepository;

@Service
public class RefundRequestServiceImpl implements RefundRequestService {

    private final RefundRequestRepository refundRequestRepository;
    private final OrderRepository orderRepository;
    private final CreditRefundService creditRefundService;
    private final EventService eventService;
    private final Duration window;          // how long after delivery a customer may ask for a refund

    public RefundRequestServiceImpl(RefundRequestRepository refundRequestRepository,
                                    OrderRepository orderRepository,
                                    CreditRefundService creditRefundService,
                                    EventService eventService,
                                    @Value("${refund.window-minutes}") long windowMinutes) {
        this.refundRequestRepository = refundRequestRepository;
        this.orderRepository = orderRepository;
        this.creditRefundService = creditRefundService;
        this.eventService = eventService;
        this.window = Duration.ofMinutes(windowMinutes);
    }

    @Override
    @Transactional
    public RefundRequest submit(Long orderId, String reason, User user) {
        if (!user.hasRole(Role.CUSTOMER))
            throw new PermissionDeniedException("Only a customer can request a refund");
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order", orderId));
        if (!order.getCustomer().getUserId().equals(user.getUserId()))
            throw new PermissionDeniedException("Order " + orderId + " is not yours");
        if (refundRequestRepository.existsByOrderId(orderId))
            throw new IllegalStateException("A refund was already requested for order " + orderId);

        // checks: reason given, order DELIVERED, still inside the window
        RefundRequest saved = refundRequestRepository.save(
                RefundRequest.open(order, reason, window, Instant.now()));
        eventService.record("RefundRequest", saved.getRequestId(), null, saved.getStatus(), user, reason);
        return saved;
    }

    @Override
    @Transactional
    public RefundRequest approve(Long requestId, String note, User user) {
        requireOperator(user);
        RefundRequest request = findById(requestId);
        request.approve(user.getUserId(), note);            // PENDING -> APPROVED, throws otherwise
        RefundRequest saved = refundRequestRepository.save(request);
        eventService.record("RefundRequest", requestId, RefundRequestStatus.PENDING, saved.getStatus(), user, note);

        Order order = orderRepository.findById(saved.getOrderId())
                .orElseThrow(() -> new NotFoundException("Order", saved.getOrderId()));
        creditRefundService.refund(order, saved.getReason(), user);   // money back + ledger REFUND
        return saved;
    }

    @Override
    @Transactional
    public RefundRequest reject(Long requestId, String note, User user) {
        requireOperator(user);
        RefundRequest request = findById(requestId);
        request.reject(user.getUserId(), note);             // PENDING -> REJECTED, note required
        RefundRequest saved = refundRequestRepository.save(request);
        eventService.record("RefundRequest", requestId, RefundRequestStatus.PENDING, saved.getStatus(), user, note);
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RefundRequest> pending(User user) {
        requireOperator(user);
        return refundRequestRepository.findByStatusOrderByRequestedAtAsc(RefundRequestStatus.PENDING);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RefundRequest> list(User user) {
        return switch (user.getRole()) {
            case CUSTOMER         -> refundRequestRepository.findByCustomerIdOrderByRequestedAtDesc(user.getUserId());
            case RESTAURANT_OWNER -> refundRequestRepository.findByRestaurantIdOrderByRequestedAtDesc(
                    restaurantIdOf(user));
            case OPERATOR         -> refundRequestRepository.findAllByOrderByRequestedAtDesc();
            case COURIER          -> throw new PermissionDeniedException("Couriers have no refund requests");
        };
    }

    @Override
    @Transactional(readOnly = true)
    public RefundRequest getForOrder(Long orderId, User user) {
        RefundRequest request = refundRequestRepository.findByOrderId(orderId)
                .orElseThrow(() -> new NotFoundException("Refund request for order", orderId));
        boolean allowed = switch (user.getRole()) {
            case CUSTOMER         -> request.getCustomerId().equals(user.getUserId());
            case RESTAURANT_OWNER -> request.getRestaurantId().equals(restaurantIdOf(user));
            case OPERATOR         -> true;
            case COURIER          -> false;
        };
        if (!allowed)
            throw new PermissionDeniedException("You cannot view the refund request for order " + orderId);
        return request;
    }

    private RefundRequest findById(Long requestId) {
        return refundRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Refund request", requestId));
    }

    private static void requireOperator(User user) {
        if (!user.hasRole(Role.OPERATOR))
            throw new PermissionDeniedException("Only an operator can decide a refund request");
    }

    private static Long restaurantIdOf(User user) {
        return ((RestaurantOwner) user).getRestaurant().getRestaurantId();
    }
}
