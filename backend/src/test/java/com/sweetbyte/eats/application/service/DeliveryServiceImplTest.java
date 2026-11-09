package com.sweetbyte.eats.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.Operator;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.repository.persistence.CourierRepository;
import com.sweetbyte.eats.repository.persistence.OrderRepository;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;

class DeliveryServiceImplTest {

    private final OrderRepository orders = mock(OrderRepository.class);
    private final CourierRepository couriers = mock(CourierRepository.class);
    private final LedgerService ledger = mock(LedgerService.class);
    private final PricingService pricing = mock(PricingService.class);
    private final List<Courier> allCouriers = new ArrayList<>();
    private final List<Order> allOrders = new ArrayList<>();
    private final Restaurant restaurant = new Restaurant("R", 45.50, -73.50);
    private final Customer customer = new Customer(UUID.randomUUID(), "C", "c@t", "addr", 45.60, -73.60);
    private final Operator operator = new Operator(UUID.randomUUID(), "O", "o@t");
    private DeliveryServiceImpl service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(restaurant, "restaurantId", 1L);
        restaurant.changeStatus(RestaurantStatus.OPEN);
        service = new DeliveryServiceImpl(orders, couriers, mock(RestaurantRepository.class),
                mock(EventService.class), ledger, pricing, mock(PlatformTransactionManager.class));

        when(couriers.findByStatus(any())).thenAnswer(call ->
                allCouriers.stream().filter(c -> c.getStatus() == call.getArgument(0)).toList());
        when(couriers.findById(anyLong())).thenAnswer(call ->
                allCouriers.stream().filter(c -> c.getUserId().equals(call.getArgument(0))).findFirst());
        when(orders.findById(anyLong())).thenAnswer(call -> order(call.getArgument(0)));
        when(orders.findWithDeliveryDetailsByOrderId(anyLong())).thenAnswer(call -> order(call.getArgument(0)));
        when(orders.findByCourierUserIdAndStatusIn(anyLong(), any())).thenAnswer(call -> allOrders.stream()
                .filter(o -> o.getCourier() != null && o.getCourier().getUserId().equals(call.getArgument(0)))
                .filter(o -> o.getStatus() == OrderStatus.READY || o.getStatus() == OrderStatus.PICKED_UP)
                .findFirst());
    }

    private Optional<Order> order(Long id) {
        return allOrders.stream().filter(o -> o.getOrderId().equals(id)).findFirst();
    }

    private Courier idleCourier(long id, double latitude, double longitude) {
        Courier courier = new Courier(UUID.randomUUID(), "C" + id, id + "@t", latitude, longitude);
        ReflectionTestUtils.setField(courier, "userId", id);
        courier.goOnline();
        allCouriers.add(courier);
        return courier;
    }

    private Order ready(long id) {
        Order order = new Order(customer, restaurant);
        ReflectionTestUtils.setField(order, "orderId", id);
        order.accept();
        order.startPreparing();
        order.markReady();
        allOrders.add(order);
        service.onOrderReady(new OrderReadyEvent(id));
        return order;
    }

    private Optional<Long> offeredTo(Courier courier) {
        return service.currentDelivery(courier).filter(d -> !d.accepted()).map(d -> d.order().getOrderId());
    }

    @Test
    void offersNearestIdleCourierAndBreaksTiesByLowestId() {
        Courier far = idleCourier(1, 45.90, -73.50);
        Courier tiedHigh = idleCourier(3, 45.51, -73.50);
        Courier tiedLow = idleCourier(2, 45.51, -73.50);

        ready(10);

        assertEquals(Optional.of(10L), offeredTo(tiedLow));
        assertTrue(offeredTo(far).isEmpty());
        assertTrue(offeredTo(tiedHigh).isEmpty());
    }

    @Test
    void offeredCourierIsNotOfferedASecondOrder() {
        Courier only = idleCourier(1, 45.50, -73.50);
        ready(10);
        ready(11);

        assertEquals(Optional.of(10L), offeredTo(only));
        assertEquals(1, service.dispatchQueue(operatorUser()).size());
    }

    @Test
    void declineOffersNextCourierOrWaitsWithoutReofferingTheDecliner() {
        Courier near = idleCourier(1, 45.50, -73.50);
        Courier next = idleCourier(2, 45.60, -73.50);
        ready(10);

        service.declineOffer(near);
        assertEquals(Optional.of(10L), offeredTo(next));

        service.declineOffer(next);       // near was never offered again in this pass
        assertEquals(Optional.of(10L), offeredTo(near));
        service.declineOffer(near);
        assertEquals(Optional.of(10L), offeredTo(next));
    }

    @Test
    void onlyIdleCourierDecliningLeavesOrderQueued() {
        Courier only = idleCourier(1, 45.50, -73.50);
        ready(10);

        service.declineOffer(only);

        assertTrue(offeredTo(only).isEmpty());
        assertEquals(1, service.dispatchQueue(operatorUser()).size());
    }

    @Test
    void fullDeliveryMovesCourierAndRecordsCharge() {
        Courier courier = idleCourier(1, 45.40, -73.40);
        Order order = ready(10);

        service.acceptOffer(courier);
        assertEquals(CourierStatus.ASSIGNED, courier.getStatus());
        assertThrows(IllegalStateException.class, () -> service.confirmDelivery(courier));

        service.confirmPickup(courier);
        assertEquals(OrderStatus.PICKED_UP, order.getStatus());
        assertEquals(CourierStatus.CARRYING, courier.getStatus());
        assertEquals(45.50, courier.getLatitude());
        assertThrows(IllegalStateException.class, () -> service.goOffDuty(courier));

        service.confirmDelivery(courier);
        assertEquals(OrderStatus.DELIVERED, order.getStatus());
        assertEquals(CourierStatus.IDLE, courier.getStatus());
        assertEquals(45.60, courier.getLatitude());
        verify(pricing).recordFare(order);
        verify(ledger).recordFinalState(order);
    }

    @Test
    void courierBecomingIdleRetriesQueueOldestFirst() {
        Courier courier = idleCourier(1, 45.50, -73.50);
        ready(10);
        ready(11);
        service.acceptOffer(courier);
        service.confirmPickup(courier);

        service.confirmDelivery(courier);

        assertEquals(Optional.of(11L), offeredTo(courier));
    }

    @Test
    void unacceptedOfferRequeuesWhenCourierGoesOffline() {
        Courier courier = idleCourier(1, 45.50, -73.50);
        Order order = ready(10);

        service.goOffDuty(courier);

        assertEquals(CourierStatus.OFFLINE, courier.getStatus());
        assertEquals(null, order.getCourier());
        assertEquals(1, service.dispatchQueue(operatorUser()).size());
    }

    @Test
    void acceptedOrderStallsUntilOperatorReassigns() {
        Courier first = idleCourier(1, 45.50, -73.50);
        Order order = ready(10);
        service.acceptOffer(first);
        Courier second = idleCourier(2, 45.60, -73.50);

        assertThrows(IllegalStateException.class, () -> service.reassign(10L, operatorUser()));
        service.goOffDuty(first);
        assertTrue(order.isStalled());
        assertTrue(offeredTo(second).isEmpty());

        service.reassign(10L, operatorUser());

        assertFalse(order.isStalled());
        assertEquals(CourierStatus.OFFLINE, first.getStatus());
        assertEquals(Optional.of(10L), offeredTo(second));
    }

    @Test
    void courierReturningWithAcceptedOrderResumesIt() {
        Courier courier = idleCourier(1, 45.50, -73.50);
        Order order = ready(10);
        service.acceptOffer(courier);
        service.goOffDuty(courier);

        service.goOnDuty(courier);

        assertEquals(CourierStatus.ASSIGNED, courier.getStatus());
        assertFalse(order.isStalled());
    }

    private Operator operatorUser() {
        return operator;
    }
}
