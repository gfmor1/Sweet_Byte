package com.sweetbyte.eats.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.sweetbyte.eats.application.model.Fare;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.PricingConfig;
import com.sweetbyte.eats.repository.persistence.BillingRecordRepository;

class PricingServiceImplCharacterisationTest {

    private BillingRecordRepository repo;
    private PricingConfig config;
    private PricingServiceImpl service;

    @BeforeEach
    void setUp() {
        repo = mock(BillingRecordRepository.class);
        config = new PricingConfig(new BigDecimal("2.99"), new BigDecimal("1.50"),
                new BigDecimal("15.00"), new BigDecimal("1.50"));
        service = newService();
    }

    // Only this method changes after the refactoring
    private PricingServiceImpl newService() {
        return new PricingServiceImpl(repo, config);
    }

    private Order orderWithSubtotal(String subtotal) {
        Order order = mock(Order.class);
        when(order.getSubtotal()).thenReturn(new BigDecimal(subtotal));
        return order;
    }

    @Test
    void subtotal14_99_getsSmallOrderSurcharge() {
        Fare f = service.computeFare(orderWithSubtotal("14.99"));
        assertEquals(new BigDecimal("1.50"), f.getSmallOrderSurcharge());
        assertEquals(new BigDecimal("20.98"), f.getTotal());
    }

    @Test
    void subtotal15_00_hasNoSurcharge() {
        Fare f = service.computeFare(orderWithSubtotal("15.00"));
        assertEquals(new BigDecimal("0.00"), f.getSmallOrderSurcharge());
        assertEquals(new BigDecimal("19.49"), f.getTotal());
    }

    @Test
    void subtotal30_00_normalBreakdown() {
        Fare f = service.computeFare(orderWithSubtotal("30.00"));
        assertEquals(new BigDecimal("2.99"), f.getDeliveryFee());
        assertEquals(new BigDecimal("1.50"), f.getServiceFee());
        assertEquals(new BigDecimal("34.49"), f.getTotal());
    }
}