package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.enums.BillingRecordType;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.model.Fare;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.PricingConfig;
import com.sweetbyte.eats.application.pricing.*;
import com.sweetbyte.eats.repository.persistence.BillingRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sweetbyte.eats.application.model.BillingRecord;


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
    public Fare computeFare(Order order){
        return calculator.calculate(order).toFare();
    }

    @Override
    @Transactional
    public BillingRecord recordFare(Order order) {
        Objects.requireNonNull(order.getOrderId(), "Save the order before recording its fare");
        // idempotent: if the PAYMENT row already exists, keep the original (the fare never changes)
        return billingRecordRepository.findByOrderIdAndType(order.getOrderId(), BillingRecordType.PAYMENT)
                .orElseGet(() -> billingRecordRepository.save(
                        BillingRecord.payment(order.getOrderId(), computeFare(order))));
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
