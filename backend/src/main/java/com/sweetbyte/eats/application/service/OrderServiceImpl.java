package com.sweetbyte.eats.application.service;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.CardDetails;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.Fare;
import com.sweetbyte.eats.application.model.Payment;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.model.MenuItem;
import com.sweetbyte.eats.application.model.PlaceOrderCommand;
import com.sweetbyte.eats.repository.persistence.MenuItemRepository;
import com.sweetbyte.eats.repository.persistence.OrderRepository;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;
import com.sweetbyte.eats.application.permission.OrderPermissionResolver;
@Service
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final RestaurantRepository restaurantRepository;
    private final MenuItemRepository menuItemRepository;
    private final EventService eventService;
    private final OrderPermissionResolver permissionResolver;
    private final DispatchService dispatchService;
    private final PricingService pricingService;
    private final CreditRefundService creditRefundService;
    private final PromoService promoService;

    public OrderServiceImpl(OrderRepository orderRepository,
                            RestaurantRepository restaurantRepository,
                            MenuItemRepository menuItemRepository,
                            EventService eventService,
                            OrderPermissionResolver permissionResolver,
                            DispatchService dispatchService,
                            PricingService pricingService,
                            CreditRefundService creditRefundService) {
        this.pricingService = pricingService;
        this.creditRefundService = creditRefundService;
        this.eventService = eventService;
        this.orderRepository = orderRepository;
        this.restaurantRepository = restaurantRepository;
        this.menuItemRepository = menuItemRepository;
        this.permissionResolver = permissionResolver;
        this.dispatchService = dispatchService;
        this.promoService = promoService;
    }

    @Override
    @Transactional
    public Order placeOrder(PlaceOrderCommand command, User user) {
        validatePlacement(command, user);                        // input checks, before any DB access
        Order order = buildOrder(command, (Customer) user);      // safe cast: role checked above
        BigDecimal discount = resolveDiscount(command.promoCode(), order.getSubtotal());
        chargeCard(order, command.card(), discount);
        return saveAndRecord(order, user, discount);
    }

    // The order of the checks is part of the contract (which message wins): items -> role -> coordinates -> card.
    private void validatePlacement(PlaceOrderCommand command, User user) {
        if (command.itemQuantities().isEmpty())
            throw new IllegalArgumentException("Order needs at least one item");
        if (!user.hasRole(Role.CUSTOMER))
            throw new PermissionDeniedException("Only a customer can place an order");
        if (command.latitude() == null || command.longitude() == null)
            throw new IllegalArgumentException("Delivery coordinates are required");
        if (command.card() == null)
            throw new IllegalArgumentException("Payment information is required");
    }

    private Order buildOrder(PlaceOrderCommand command, Customer customer) {
        Restaurant restaurant = restaurantRepository.findById(command.restaurantId())
                .orElseThrow(() -> new NotFoundException("Restaurant", command.restaurantId()));
        Order order = new Order(customer, restaurant, command.deliveryAddress(),
                command.latitude(), command.longitude());
        command.itemQuantities().forEach((menuItemId, quantity) ->
                order.addLine(findMenuItem(menuItemId), quantity));
        return order;
    }

    // R-PROMO-01: at most one code, validated at placement time, once the subtotal is known.
    // No code means no discount; an invalid one refuses the placement before the card is charged.
    private BigDecimal resolveDiscount(String promoCode, BigDecimal subtotal) {
        return (promoCode == null || promoCode.isBlank())
                ? BigDecimal.ZERO
                : promoService.validate(promoCode, subtotal);
    }

    // Mock charge: the customer pays the fare total, computed by the same pricing chain as billing.
    private void chargeCard(Order order, CardDetails card, BigDecimal discount) {
        Fare fare = pricingService.computeFare(order, discount);
        order.pay(Payment.card(card.brand(), card.last4(), card.holder(),
                card.expMonth(), card.expYear(), fare.getTotal()));
    }

    // The same discount reaches the charge and the ledger, so they can never disagree.
    private Order saveAndRecord(Order order, User user, BigDecimal discount) {
        Order saved = orderRepository.save(order);
        pricingService.recordFare(saved, discount);    // new BillingRecord for this order (same transaction)
        eventService.record("Order", saved.getOrderId(), null, saved.getStatus(), user, null);
        return saved;
    }

    @Override
    @Transactional
    public List<Order> getUsersOrders(User user) {
        return orderRepository.findByCustomerUserId(user.getUserId());
    }

    @Override
    @Transactional
    public List<Order> getRestaurantOrders(Long restaurantId, User user) {
        permissionResolver.requireViewRestaurantOrders(user, restaurantId); //refactored to strategy method
        return orderRepository.findByRestaurantRestaurantId(restaurantId);
    }

    @Override
    @Transactional
    public Order getOrder(Long orderId, User user) {
        Order order = findOrderById(orderId);
        permissionResolver.requireView(user, order); //refactored with strategy method
        return order;
    }

    @Override
    @Transactional
    public Order rejectOrder(Long orderId, User user, String reason) {
        Order order = findOrderById(orderId);
        permissionResolver.requireManage(user, order);
        OrderStatus from = order.getStatus();
        order.reject(reason);
        Order saved = orderRepository.save(order);
        eventService.record("Order", saved.getOrderId(), from, saved.getStatus(), user, reason);
        creditRefundService.refund(saved, reason, user);    // Automatic Credit Refund: customer paid at placement
        return saved;
    }

    @Transactional
    @Override
    public Order updateOrderStatus(Long orderId, OrderStatus newStatus, User user) {
        Order order = findOrderById(orderId);
        permissionResolver.requireManage(user, order); //refactored with strategy method
        OrderStatus from = order.getStatus();
        if (newStatus == OrderStatus.ACCEPTED) {
            order.accept();
        } else if (newStatus == OrderStatus.PREPARING) {
            order.startPreparing();
        } else if (newStatus == OrderStatus.READY) {
            order.markReady();
        } else
            throw new IllegalArgumentException("Error : cannot update order to status " + newStatus);
        Order saved = orderRepository.save(order);
        eventService.record("Order", saved.getOrderId(), from, saved.getStatus(), user, null);
        if (saved.getStatus() == OrderStatus.READY) {
            dispatchService.onOrderReady(saved, user);    // R-DLV-01: dispatch starts only once READY
        }
        return saved;
    }

    @Transactional
    @Override
    public void cancelOrder(Long orderId, User user) {
        Order order = findOrderById(orderId);
        permissionResolver.requireCancel(user,order); //refactored with Strategy method
        OrderStatus from = order.getStatus();
        if (user.hasRole(Role.OPERATOR)) {
            order.cancelByOperator();
        } else {
            order.cancelByCustomer();
        }
        orderRepository.save(order);
        eventService.record("Order", order.getOrderId(), from, order.getStatus(), user, null);
        creditRefundService.refund(order, "Order cancelled", user);    // Automatic Credit Refund
    }

    private Order findOrderById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order", orderId));
    }

    private MenuItem findMenuItem(Long menuItemId) {
        return menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new NotFoundException("Menu item", menuItemId));
    }

}