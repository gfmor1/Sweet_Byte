package com.sweetbyte.eats.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import com.sweetbyte.eats.application.enums.MenuItemStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.CardDetails;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.Fare;
import com.sweetbyte.eats.application.model.MenuItem;
import com.sweetbyte.eats.application.model.Operator;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.OrderLine;
import com.sweetbyte.eats.application.model.PlaceOrderCommand;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.permission.OrderPermissionResolver;
import com.sweetbyte.eats.repository.persistence.MenuItemRepository;
import com.sweetbyte.eats.repository.persistence.OrderRepository;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;

/**
 * Characterisation tests for OrderServiceImpl.placeOrder (Phase 4, refactoring R2).
 *
 * A characterisation test does not check what the code SHOULD do; it records
 * what the code DOES today, so we notice if the refactoring changes anything.
 *
 * They pin down:
 *   1. the happy path: what a successful placement produces and in which order it calls things;
 *   2. every refusal, with its exact exception type and message;
 *   3. the order of the checks: which refusal wins when several problems exist at once.
 *
 * They must pass before and after the refactoring. Only the place(...) helper
 * may change, if the refactoring changes the signature of placeOrder.
 *
 * How it works: OrderServiceImpl is created with Mockito mocks (fake objects) for its
 * 8 dependencies, so no database or Spring context is needed. The domain objects
 * (Customer, Restaurant, MenuItem, Order) are real, so their own rules still apply.
 */
class OrderServicePlaceOrderCharacterisationTest {

    // ---- Test data: fixed values so every expected result can be checked by hand ----

    private static final long RESTAURANT_ID = 1L;
    private static final long CAKE_ID = 10L;
    private static final long COOKIE_ID = 11L;
    private static final String ADDRESS = "1455 De Maisonneuve Blvd W";
    private static final double LAT = 45.4972;
    private static final double LON = -73.5790;
    // Expiry far in the future so the card never counts as expired when the test runs.
    private static final CardDetails CARD = new CardDetails("VISA", "4242", "Ada Lovelace", 12, 2099);
    // The fare the (mocked) pricing service returns: 13.00 + 2.99 + 1.50 + 1.50 = 18.99.
    // The pricing rules themselves are tested separately; here we only check that
    // placeOrder charges whatever total the pricing service gives it.
    private static final Fare FARE = new Fare(new BigDecimal("13.00"), new BigDecimal("2.99"),
            new BigDecimal("1.50"), new BigDecimal("1.50"));

    // ---- The 8 dependencies of OrderServiceImpl, all replaced by mocks ----

    private OrderRepository orderRepository;
    private RestaurantRepository restaurantRepository;
    private MenuItemRepository menuItemRepository;
    private EventService eventService;
    private OrderPermissionResolver permissionResolver;
    private DispatchService dispatchService;
    private PricingService pricingService;
    private CreditRefundService creditRefundService;
    private PromoService promoService;
    private OrderServiceImpl service;          // the real class under test

    // ---- Real domain objects used in the orders ----

    private Customer customer;
    private Restaurant restaurant;
    private MenuItem cake;
    private MenuItem cookie;

    // Runs before EVERY test, so each test starts from the same clean state.
    @BeforeEach
    void setUp() {
        // 1. Create a mock for each dependency and build the real service with them.
        orderRepository = mock(OrderRepository.class);
        restaurantRepository = mock(RestaurantRepository.class);
        menuItemRepository = mock(MenuItemRepository.class);
        eventService = mock(EventService.class);
        permissionResolver = mock(OrderPermissionResolver.class);
        dispatchService = mock(DispatchService.class);
        pricingService = mock(PricingService.class);
        creditRefundService = mock(CreditRefundService.class);
        promoService = mock(PromoService.class);
        service = new OrderServiceImpl(orderRepository, restaurantRepository, menuItemRepository,
                eventService, permissionResolver, dispatchService, pricingService, creditRefundService, promoService);

        // 2. A customer, an OPEN restaurant (restaurants start CLOSED) and two available items.
        customer = new Customer(UUID.randomUUID(), "Ada", "ada@example.com");
        restaurant = new Restaurant("Sweet Spot", 45.50, -73.57);
        restaurant.open();
        cake =new MenuItem(restaurant, "Cheesecake", new BigDecimal("8.00"), MenuItemStatus.AVAILABLE);
        cookie = new MenuItem(restaurant, "Cookie", new BigDecimal("2.50"), MenuItemStatus.AVAILABLE);

        // 3. Tell the mocks what to answer ("when X is called, return Y").
        //    Tests that need a different answer (e.g. "not found") override these.
        when(restaurantRepository.findById(RESTAURANT_ID)).thenReturn(Optional.of(restaurant));
        when(menuItemRepository.findById(CAKE_ID)).thenReturn(Optional.of(cake));
        when(menuItemRepository.findById(COOKIE_ID)).thenReturn(Optional.of(cookie));
        when(pricingService.computeFare(any(Order.class), any(BigDecimal.class))).thenReturn(FARE);
        // save() returns the same order it receives, like a real repository would.
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---- Helpers ----

    /**
     * The ONLY place that calls placeOrder. If the refactoring changes its signature
     * (e.g. to take a PlaceOrderCommand), only this method changes: every test and
     * every assertion below stays exactly the same.
     */
    private Order place(Map<Long, Integer> items, String address, Double lat, Double lon,
                        CardDetails card, User user) {
        return service.placeOrder(new PlaceOrderCommand(RESTAURANT_ID, items, address, lat, lon, card), user);
    }

    /**
     * Builds the cart: items(CAKE_ID, 1, COOKIE_ID, 2) means 1 cake and 2 cookies.
     * Uses a LinkedHashMap so lines are added in a predictable order.
     */
    private static Map<Long, Integer> items(Object... idQty) {
        Map<Long, Integer> m = new LinkedHashMap<>();
        for (int i = 0; i < idQty.length; i += 2) {
            m.put(((Number) idQty[i]).longValue(), (Integer) idQty[i + 1]);
        }
        return m;
    }

    /** Checks that the call fails with exactly this exception type AND this message. */
    private static <T extends Throwable> void assertRefused(Class<T> type, String message,
                                                            org.junit.jupiter.api.function.Executable call) {
        T e = assertThrows(type, call);
        assertEquals(message, e.getMessage());
    }

    // =====================================================================
    // 1. HAPPY PATH: a valid order from a customer
    // =====================================================================

    // A valid order of 1 cake + 2 cookies is created with the right data.
    // The address is sent with extra spaces to pin down that it gets trimmed.
    @Test
    void placesAnOrderWithItsLinesAddressAndPlacedStatus() {
        Order order = place(items(CAKE_ID, 1, COOKIE_ID, 2), "  " + ADDRESS + "  ", LAT, LON, CARD, customer);

        // New orders start in PLACED (first state of the lifecycle, R-ORD-04).
        assertEquals(OrderStatus.PLACED, order.getStatus());
        assertSame(customer, order.getCustomer());
        assertSame(restaurant, order.getRestaurant());
        assertEquals(ADDRESS, order.getDeliveryAddress());            // trimmed
        assertEquals(LAT, order.getDeliveryLatitude());
        assertEquals(LON, order.getDeliveryLongitude());
        // One order line per cart entry, in the same order, with the right quantities.
        List<OrderLine> lines = order.getLines();
        assertEquals(2, lines.size());
        assertSame(cake, lines.get(0).getItem());
        assertEquals(1, lines.get(0).getQuantity());
        assertSame(cookie, lines.get(1).getItem());
        assertEquals(2, lines.get(1).getQuantity());
        // 1 x 8.00 + 2 x 2.50 = 13.00
        assertEquals(new BigDecimal("13.00"), order.getSubtotal());
    }

    // The card payment is attached to the order for exactly the fare total
    // returned by the pricing service (18.99), with the card's brand and last 4 digits.
    @Test
    void chargesTheCardTheFareTotal() {
        Order order = place(items(CAKE_ID, 1), ADDRESS, LAT, LON, CARD, customer);

        assertEquals("CARD", order.getPayment().getMethod());
        assertEquals("VISA", order.getPayment().getCardBrand());
        assertEquals("4242", order.getPayment().getCardLast4());
        assertEquals(new BigDecimal("18.99"), order.getPayment().getAmount());
    }

    // The 4 side effects happen, and in THIS order:
    //   compute fare -> save order -> record billing (needs the saved order) -> emit PLACED event.
    // A refactoring that reorders these steps would fail here.
    @Test
    void pricesThenSavesThenRecordsFareThenEmitsPlacedEvent() {
        Order order = place(items(CAKE_ID, 1), ADDRESS, LAT, LON, CARD, customer);

        InOrder sequence = inOrder(pricingService, orderRepository, eventService);
        sequence.verify(pricingService).computeFare(order, BigDecimal.ZERO);
        sequence.verify(orderRepository).save(order);
        sequence.verify(pricingService).recordFare(order, BigDecimal.ZERO);
        // Event: entity "Order", no previous state (null) -> PLACED, by the customer, no note.
        sequence.verify(eventService).record("Order", order.getOrderId(), null, OrderStatus.PLACED, customer, null);
    }

    // Placing an order must NOT trigger dispatch (only READY orders are dispatched, R-DLV-01),
    // must NOT refund, and does not use the permission resolver (the role check is done inline).
    @Test
    void doesNotDispatchRefundOrCheckPermissionsWhenPlacing() {
        place(items(CAKE_ID, 1), ADDRESS, LAT, LON, CARD, customer);

        verifyNoInteractions(dispatchService, creditRefundService, permissionResolver);
    }

    // =====================================================================
    // 2. REFUSALS: each invalid input is refused with its exact type and message
    //    (the message is what the user sees in the dashboard console)
    // =====================================================================

    // Empty cart.
    @Test
    void refusesAnOrderWithNoItems() {
        assertRefused(IllegalArgumentException.class, "Order needs at least one item",
                () -> place(items(), ADDRESS, LAT, LON, CARD, customer));
    }

    // Only customers may order: an operator is refused (operators cannot place orders).
    @Test
    void refusesANonCustomer() {
        Operator operator = new Operator(UUID.randomUUID(), "Op", "op@example.com");
        assertRefused(PermissionDeniedException.class, "Only a customer can place an order",
                () -> place(items(CAKE_ID, 1), ADDRESS, LAT, LON, CARD, operator));
    }

    // Delivery coordinates are required: latitude missing...
    @Test
    void refusesMissingLatitude() {
        assertRefused(IllegalArgumentException.class, "Delivery coordinates are required",
                () -> place(items(CAKE_ID, 1), ADDRESS, null, LON, CARD, customer));
    }

    // ...or longitude missing (same message).
    @Test
    void refusesMissingLongitude() {
        assertRefused(IllegalArgumentException.class, "Delivery coordinates are required",
                () -> place(items(CAKE_ID, 1), ADDRESS, LAT, null, CARD, customer));
    }

    // No card: the customer pays at placement, so payment details are mandatory.
    @Test
    void refusesMissingCard() {
        assertRefused(IllegalArgumentException.class, "Payment information is required",
                () -> place(items(CAKE_ID, 1), ADDRESS, LAT, LON, null, customer));
    }

    // The restaurant id does not exist in the database.
    @Test
    void refusesAnUnknownRestaurant() {
        when(restaurantRepository.findById(RESTAURANT_ID)).thenReturn(Optional.empty());
        assertRefused(NotFoundException.class, "Restaurant 1 not found",
                () -> place(items(CAKE_ID, 1), ADDRESS, LAT, LON, CARD, customer));
    }

    // A menu item id in the cart does not exist.
    @Test
    void refusesAnUnknownMenuItem() {
        when(menuItemRepository.findById(anyLong())).thenReturn(Optional.empty());
        assertRefused(NotFoundException.class, "Menu item 99 not found",
                () -> place(items(99L, 1), ADDRESS, LAT, LON, CARD, customer));
    }

    // R-ORD-02: no orders at a closed (or paused) restaurant.
    // This rule lives in the Order constructor, but placeOrder must still surface it.
    @Test
    void refusesAClosedRestaurant() {
        restaurant.close();
        assertRefused(IllegalStateException.class, "Sweet Spot is not accepting orders",
                () -> place(items(CAKE_ID, 1), ADDRESS, LAT, LON, CARD, customer));
    }

    // R-ORD-02: no order containing a sold-out item (rule lives in Order.addLine).
    @Test
    void refusesASoldOutItem() {
        MenuItem soldOut = new MenuItem(restaurant, "Macaron", new BigDecimal("3.00"), MenuItemStatus.SOLD_OUT);
        when(menuItemRepository.findById(12L)).thenReturn(Optional.of(soldOut));
        assertRefused(IllegalStateException.class, "Macaron is sold out",
                () -> place(items(12L, 1), ADDRESS, LAT, LON, CARD, customer));
    }

    // =====================================================================
    // 3. ORDER OF THE CHECKS: when several things are wrong at once, which
    //    message does the user get? Extract Method can silently reorder
    //    checks, so these tests protect the current priority:
    //    items -> role -> coordinates -> card -> restaurant -> menu items
    // =====================================================================

    // Empty cart AND wrong role AND no coordinates AND no card: "no items" wins.
    @Test
    void noItemsIsCheckedBeforeTheRole() {
        Operator operator = new Operator(UUID.randomUUID(), "Op", "op@example.com");
        assertRefused(IllegalArgumentException.class, "Order needs at least one item",
                () -> place(items(), ADDRESS, null, null, null, operator));
    }

    // Wrong role AND no coordinates AND no card: the role refusal wins.
    @Test
    void roleIsCheckedBeforeCoordinatesAndCard() {
        Operator operator = new Operator(UUID.randomUUID(), "Op", "op@example.com");
        assertRefused(PermissionDeniedException.class, "Only a customer can place an order",
                () -> place(items(CAKE_ID, 1), ADDRESS, null, null, null, operator));
    }

    // No coordinates AND no card: the coordinates refusal wins.
    @Test
    void coordinatesAreCheckedBeforeTheCard() {
        assertRefused(IllegalArgumentException.class, "Delivery coordinates are required",
                () -> place(items(CAKE_ID, 1), ADDRESS, null, null, null, customer));
    }

    // Invalid input is refused BEFORE touching the database:
    // no repository, pricing or event call happens at all.
    @Test
    void inputChecksRunBeforeAnyRepositoryLookup() {
        assertThrows(IllegalArgumentException.class,
                () -> place(items(CAKE_ID, 1), ADDRESS, LAT, LON, null, customer));
        verifyNoInteractions(restaurantRepository, menuItemRepository, orderRepository, pricingService, eventService);
    }

    // If an item is refused while building the order, nothing is priced, saved,
    // billed or announced: no half-created order is left behind.
    @Test
    void nothingIsSavedOrBilledWhenAnItemIsRefused() {
        when(menuItemRepository.findById(anyLong())).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class,
                () -> place(items(99L, 1), ADDRESS, LAT, LON, CARD, customer));
        verifyNoInteractions(orderRepository, pricingService, eventService);
    }
}
