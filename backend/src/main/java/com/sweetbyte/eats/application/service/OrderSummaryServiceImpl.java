package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.model.Fare;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.OrderSummary;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.permission.OrderPermissionResolver;
import com.sweetbyte.eats.repository.persistence.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderSummaryServiceImpl implements OrderSummaryService{

    private final OrderRepository orderRepository;
    private final OrderPermissionResolver permissionResolver;
    private final PricingService pricingService;
    private final LedgerService ledgerService;

    public OrderSummaryServiceImpl(OrderRepository orderRepository,
                                   OrderPermissionResolver permissionResolver,
                                   PricingService pricingService,
                                   LedgerService ledgerService) {
        this.orderRepository = orderRepository;
        this.permissionResolver = permissionResolver;
        this.pricingService = pricingService;
        this.ledgerService = ledgerService;
    }


    @Override
    @Transactional(readOnly = true)
    public OrderSummary getSummary(Long orderId, User user) {
        Order order = loadAndCheck(orderId, user);
        if (!order.isTerminal())
            throw new IllegalStateException("The summary of order " + orderId + " is available once it is finished");
        return new OrderSummary(order, pricingService.getFare(orderId), ledgerService.entriesFor(orderId));
    }

    // Fare of any order (also before delivery), so the customer can see the price they'll pay
    @Override
    @Transactional(readOnly = true)
    public Fare getFare(Long orderId, User user) {
        loadAndCheck(orderId, user);
        return pricingService.getFare(orderId);
    }

    // shared by both methods: 404 if the order doesn't exist, 403 if the user can't see it
    private Order loadAndCheck(Long orderId, User user) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order", orderId));
        permissionResolver.requireView(user, order);
        return order;
    }
}
