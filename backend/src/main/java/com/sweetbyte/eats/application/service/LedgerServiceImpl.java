package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.enums.LedgerEntryType;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.LedgerEntry;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.LedgerEntryRepository;
import com.sweetbyte.eats.repository.persistence.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import java.util.List;

import java.math.BigDecimal;

@Service
public class LedgerServiceImpl implements LedgerService{

    private final LedgerEntryRepository ledgerEntryRepository;
    private final OrderRepository orderRepository;
    private final PricingService pricingService;
    private final EventService eventService;

    public LedgerServiceImpl(LedgerEntryRepository ledgerEntryRepository,
                             OrderRepository orderRepository,
                             PricingService pricingService,
                             EventService eventService)
    {
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.orderRepository = orderRepository;
        this.pricingService = pricingService;
        this.eventService = eventService;
    }

    @Override
    @Transactional
    public LedgerEntry refund(Long orderId, String reason, User user) {
        if (!user.hasRole(Role.OPERATOR))
            throw new PermissionDeniedException("Only an operator can refund an order");
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order", orderId));
        LedgerEntry charge = ledgerEntryRepository.findByOrderIdAndType(orderId, LedgerEntryType.CHARGE)
                .orElseThrow(() -> new IllegalStateException("Order " + orderId + " has no charge to refund"));

        OrderStatus from = order.getStatus();
        order.refund();                     // DELIVERED -> REFUNDED; throws on anything else (incl. 2nd refund)
        orderRepository.save(order);
        eventService.record("Order", orderId, from, order.getStatus(), user, reason);

        return ledgerEntryRepository.save(LedgerEntry.refund(charge, order, reason)); // separate entry, −amount
    }

    public LedgerEntry recordFinalState(Order order){
        return ledgerEntryRepository.findByOrderIdAndType(order.getOrderId(), LedgerEntryType.CHARGE)
                .orElseGet(() -> {
                    BigDecimal fareTotal = order.getStatus() == OrderStatus.DELIVERED
                            ? pricingService.getFare(order.getOrderId()).getTotal()
                            : BigDecimal.ZERO;
                    return ledgerEntryRepository.save(LedgerEntry.charge(order, fareTotal));

                });
    }

    @Override
    @Transactional(readOnly = true)
    public List<LedgerEntry> history(User user) {
        return switch (user.getRole()) {
            case CUSTOMER         -> ledgerEntryRepository.findByCustomerIdOrderByRecordedAtAsc(user.getUserId());
            case RESTAURANT_OWNER -> ledgerEntryRepository.findByRestaurantIdOrderByRecordedAtAsc(
                    ((RestaurantOwner) user).getRestaurant().getRestaurantId());
            case COURIER          -> ledgerEntryRepository.findByCourierIdOrderByRecordedAtAsc(user.getUserId());
            case OPERATOR         -> ledgerEntryRepository.findAllByOrderByRecordedAtAsc();
        };
    }

    @Override
    @Transactional(readOnly = true)
    public List<LedgerEntry> entriesFor(Long orderId) {
        return ledgerEntryRepository.findByOrderIdOrderByRecordedAtAsc(orderId);
    }
}
