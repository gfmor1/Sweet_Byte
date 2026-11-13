package com.sweetbyte.eats.application.service;

import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.enums.BillingRecordType;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.BillingRecord;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.BillingRecordRepository;
import com.sweetbyte.eats.repository.persistence.OrderRepository;

@Service
public class CreditRefundServiceImpl implements CreditRefundService {

    // States in which the customer gets their money back.
    private static final Set<OrderStatus> REFUNDABLE = EnumSet.of(
            OrderStatus.DELIVERED, OrderStatus.REJECTED, OrderStatus.CANCELLED);

    private final BillingRecordRepository billingRecordRepository;
    private final PricingService pricingService;
    private final LedgerService ledgerService;

    private final OrderRepository orderRepository;

    public CreditRefundServiceImpl(BillingRecordRepository billingRecordRepository,
                                   PricingService pricingService,
                                   LedgerService ledgerService,
                                   OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
        this.billingRecordRepository = billingRecordRepository;
        this.pricingService = pricingService;
        this.ledgerService = ledgerService;
    }

    // Joins the caller's transaction: if any step fails, the cancel/reject/approval rolls back too.
    @Override
    @Transactional
    public BillingRecord refund(Order order, String reason, User actor) {
        Objects.requireNonNull(order, "order");
        Objects.requireNonNull(actor, "actor");
        if (!REFUNDABLE.contains(order.getStatus())) {
            throw new IllegalStateException("Order " + order.getOrderId()
                    + " cannot be refunded while " + order.getStatus());
        }

        // Billing: mock "return the payment" (full fare) as a NEW REFUND row next to the PAYMENT row.
        BillingRecord payment = pricingService.recordFare(order);  // idempotent; older orders may have none
        if (billingRecordRepository.existsByOrderIdAndType(order.getOrderId(), BillingRecordType.REFUND)) {
            throw new IllegalStateException("Order " + order.getOrderId() + " was already refunded");
        }
        BillingRecord saved = billingRecordRepository.save(BillingRecord.refundOf(payment, reason));

        // Ledger
        if (order.getStatus() == OrderStatus.DELIVERED) {
            // DELIVERED -> REFUNDED, plus a REFUND entry of -(charge). Operator only.
            ledgerService.refund(order.getOrderId(), reason, actor);
        } else {
            // REJECTED / CANCELLED: the final-state CHARGE of 0 (customer pays nothing). Idempotent.
            ledgerService.recordFinalState(order);
        }
        return saved;
    }

    @Override
    @Transactional
    public BillingRecord refund(Long orderId, String reason, User actor) {
        if (!actor.hasRole(Role.OPERATOR))
            throw new PermissionDeniedException("Only an operator can refund an order");
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order", orderId));
        return refund(order, reason, actor);
    }
}
