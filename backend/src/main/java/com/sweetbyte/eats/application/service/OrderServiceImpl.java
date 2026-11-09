package com.sweetbyte.eats.application.service;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.model.MenuItem;
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

    public OrderServiceImpl(OrderRepository orderRepository, 
        RestaurantRepository restaurantRepository, 
        MenuItemRepository menuItemRepository,
        EventService eventService,
        OrderPermissionResolver permissionResolver,
        DispatchService dispatchService) {
        this.eventService = eventService;
        this.orderRepository = orderRepository;
        this.restaurantRepository = restaurantRepository;
        this.menuItemRepository = menuItemRepository;
        this.permissionResolver = permissionResolver;
        this.dispatchService = dispatchService;
    }

    @Override
    @Transactional
    public Order placeOrder(Long restaurantId, Map<Long, Integer> itemQuantities, User user) {
        if (itemQuantities.isEmpty())
            throw new IllegalArgumentException("Order needs at least one item");
        if (!user.hasRole(Role.CUSTOMER))
            throw new PermissionDeniedException("Only a customer can place an order");
        Customer customer = (Customer) user;
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
            .orElseThrow(() -> new NotFoundException("Restaurant", restaurantId));
        Order order = new Order(customer, restaurant);
        itemQuantities.forEach((menuItemId, quantity) -> {
            MenuItem menuItem = menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new NotFoundException("Menu item", menuItemId));
            order.addLine(menuItem, quantity);
        });
        Order saved = orderRepository.save(order);
        eventService.record("Order", saved.getOrderId(), null, saved.getStatus(), user, null);
        return saved;
    }

    // @Override
    // @Transactional
    // public Order createOrder(Order order, User user) {
    //     Objects.requireNonNull(order, "Order cannot be null");
    //     Objects.requireNonNull(user, "User cannot be null");

    //     if (order.getCustomer() == null || !order.getCustomer().getUserId().equals(user.getUserId()))
    //         throw new IllegalArgumentException("Order must belong to the user");
    //     if (order.getOrderId() != null)
    //         throw new IllegalArgumentException("This order already exists");
    //     return orderRepository.save(order);
    // }

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
    }



    private Order findOrderById(Long orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order", orderId));
    }

}
