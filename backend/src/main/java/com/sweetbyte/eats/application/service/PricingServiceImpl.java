package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.enums.BillingRecordType;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.model.Fare;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.PricingConfig;
import com.sweetbyte.eats.application.pricing.FareCalculator;
import com.sweetbyte.eats.application.pricing.PromoDiscountDecorator;
import com.sweetbyte.eats.repository.persistence.BillingRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sweetbyte.eats.application.model.BillingRecord;

import java.math.BigDecimal;
import java.util.Objects;

@Service
public class PricingServiceImpl implements PricingService{

    private final BillingRecordRepository billingRecordRepository;
    private final PricingConfig config;
    private final FareCalculator calculator;

    public PricingServiceImpl(BillingRecordRepository billingRecordRepository,
                              PricingConfig config,
                              FareCalculator calculator) {
        this.billingRecordRepository = billingRecordRepository;
        this.config = config;
        this.calculator = calculator;
    }

    @Override
    public Fare computeFare(Order order) {
        return computeFare(order, BigDecimal.ZERO);
    }

    // PROMO: the shared chain is built once at startup, so the discount wraps it
    // for this order only.
    @Override
    public Fare computeFare(Order order, BigDecimal discount) {
        return computeFare(order, discount, null);
    }

    @Override
    public Fare computeFare(Order order, BigDecimal discount, String promoCode) {
        FareCalculator forThisOrder = (discount == null || discount.signum() == 0)
                ? calculator
                : new PromoDiscountDecorator(calculator, discount, promoCode);
        return forThisOrder.calculate(order).toFare();
    }

    @Override
    @Transactional
    public BillingRecord recordFare(Order order) {
        return recordFare(order, BigDecimal.ZERO);
    }

    @Override
    @Transactional
    public BillingRecord recordFare(Order order, BigDecimal discount) {
        return recordFare(order, discount, null);
    }

    @Override
    @Transactional
    public BillingRecord recordFare(Order order, BigDecimal discount, String promoCode) {
        Objects.requireNonNull(order.getOrderId(), "Save the order before recording its fare");
        // if the PAYMENT row already exists, keep the original (the fare never changes)
        return billingRecordRepository.findByOrderIdAndType(order.getOrderId(), BillingRecordType.PAYMENT)
                .orElseGet(() -> billingRecordRepository.save(
                        BillingRecord.payment(order.getOrderId(), computeFare(order, discount, promoCode))));
    }

    @Override
    @Transactional(readOnly = true)
    public Fare getFare(Long orderId) {
        return billingRecordRepository.findByOrderIdAndType(orderId, BillingRecordType.PAYMENT)
                .map(BillingRecord::getFare)
                .orElseThrow(() -> new NotFoundException("Billing record for order", orderId));
    }

    @Override
    public PricingConfig getConfig() { return config; }


}