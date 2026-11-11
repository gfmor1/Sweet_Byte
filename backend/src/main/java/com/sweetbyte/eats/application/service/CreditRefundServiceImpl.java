package com.sweetbyte.eats.application.service;

import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.model.BillingRecord;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.BillingRecordRepository;

@Service
public class CreditRefundServiceImpl implements CreditRefundService {

    // States in which the customer gets their money back.
    private static final Set<OrderStatus> REFUNDABLE = EnumSet.of(
            OrderStatus.DELIVERED, OrderStatus.REJECTED, OrderStatus.CANCELLED);

    private final BillingRecordRepository billingRecordRepository;
    private final PricingService pricingService;
    private final LedgerService ledgerService;

    public CreditRefundServiceImpl(BillingRecordRepository billingRecordRepository,
                                   PricingService pricingService,
                                   LedgerService ledgerService) {
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

        // Billing: mock "return the payment" (full fare). Throws if already refunded.
        BillingRecord billing = pricingService.recordFare(order);  // idempotent; older orders may have none
        billing.markRefunded();
        BillingRecord saved = billingRecordRepository.save(billing);

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
}
