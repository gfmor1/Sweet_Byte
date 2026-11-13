package com.sweetbyte.eats.application.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.enums.BillingRecordType;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.BillingRecord;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Payment;
import com.sweetbyte.eats.application.model.PaymentEntry;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.BillingRecordRepository;
import com.sweetbyte.eats.repository.persistence.OrderRepository;

@Service
public class PaymentServiceImpl implements PaymentService {

    private final OrderRepository orderRepository;
    private final BillingRecordRepository billingRecordRepository;

    public PaymentServiceImpl(OrderRepository orderRepository, BillingRecordRepository billingRecordRepository) {
        this.orderRepository = orderRepository;
        this.billingRecordRepository = billingRecordRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentEntry> list(User user) {
        List<Order> orders = switch (user.getRole()) {
            case CUSTOMER -> orderRepository.findByCustomerUserId(user.getUserId());
            case OPERATOR -> orderRepository.findAllByOrderByOrderIdDesc();
            default -> throw new PermissionDeniedException("Only customers and operators can view payments");
        };
        if (orders.isEmpty()) return List.of();

        Map<Long, Order> byId = orders.stream().collect(Collectors.toMap(Order::getOrderId, Function.identity()));
        List<BillingRecord> records = billingRecordRepository.findByOrderIdIn(byId.keySet());
        Map<Long, BillingRecord> refunds = records.stream()
                .filter(r -> r.getType() == BillingRecordType.REFUND)
                .collect(Collectors.toMap(BillingRecord::getOrderId, Function.identity()));

        return records.stream()
                .filter(r -> r.getType() == BillingRecordType.PAYMENT)
                .map(p -> toEntry(p, refunds.get(p.getOrderId()), byId.get(p.getOrderId())))
                .sorted(Comparator.comparing(PaymentEntry::createdAt).reversed())
                .toList();
    }

    private static PaymentEntry toEntry(BillingRecord payment, BillingRecord refund, Order order) {
        Payment card = order.getPayment();      // null on orders placed before payments were wired
        return new PaymentEntry(
                payment.getId(),
                order.getOrderId(),
                order.getCustomer().getUserId(),
                order.getCustomer().getName(),
                order.getRestaurant().getName(),
                card == null ? null : card.getMethod(),
                card == null ? null : card.getCardBrand(),
                card == null ? null : card.getCardLast4(),
                payment.getAmount(),
                payment.getCreatedAt(),
                payment.getReference(),
                refund != null,
                refund == null ? null : refund.getAmount().negate(),
                refund == null ? null : refund.getCreatedAt(),
                refund == null ? null : refund.getReference(),
                refund == null ? null : refund.getReason());
    }
}
