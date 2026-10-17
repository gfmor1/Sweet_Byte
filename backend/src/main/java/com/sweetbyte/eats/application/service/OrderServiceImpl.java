package com.sweetbyte.eats.application.service;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.model.MenuItem;
import com.sweetbyte.eats.repository.persistence.MenuItemRepository;
import com.sweetbyte.eats.repository.persistence.OrderRepository;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;
@Service 
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final RestaurantRepository restaurantRepository;
    private final MenuItemRepository menuItemRepository;
    public OrderServiceImpl(OrderRepository orderRepository, 
        RestaurantRepository restaurantRepository, 
        MenuItemRepository menuItemRepository) {
        this.orderRepository = orderRepository;
        this.restaurantRepository = restaurantRepository;
        this.menuItemRepository = menuItemRepository;
    }

    @Override
    @Transactional
    public Order createOrder(Long restaurantId, Map<Long, Integer> itemQuantities, User user) {
        if (itemQuantities.isEmpty())
            throw new IllegalArgumentException("Order needs at least one item");
        if (!user.hasRole(Role.CUSTOMER))
            throw new IllegalArgumentException("Only a customer can place an order");
        Customer customer = (Customer) user;
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
            .orElseThrow(() -> new IllegalArgumentException("Restaurant not found"));
        Order order = new Order(customer, restaurant);
        itemQuantities.forEach((menuItemId, quantity) -> {
            MenuItem menuItem = menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new IllegalArgumentException("Menu item not found"));
            order.addLine(menuItem, quantity);
        });
        return orderRepository.save(order);
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
        if (!isRestaurantOwner(user, restaurantId) && user.getRole() != Role.OPERATOR)
            throw new IllegalArgumentException("User does not have permission to view this restaurant's orders");
        return orderRepository.findByRestaurantRestaurantId(restaurantId);
    }

    @Override
    @Transactional
    public Order getOrder(Long orderId, User user) {
        Order order = findOrderById(orderId);
        boolean assignedCourier = order.getCourier() != null 
            && order.getCourier().getUserId().equals(user.getUserId());
        boolean isCustomer = order.getCustomer().getUserId().equals(user.getUserId());
        if (!isCustomer && !assignedCourier)
            checkRestaurantOrOperator(order, user);
        return order;
    }

    @Override
    @Transactional
    public Order rejectOrder(Long orderId, User user, String reason) {
        Order order = findOrderById(orderId);
        checkRestaurantOrOperator(order, user);
        order.reject(reason);
        return orderRepository.save(order);
    }

    @Transactional
    @Override
    public Order updateOrderStatus(Order order, OrderStatus newStatus, User user) {
        if (newStatus == OrderStatus.ACCEPTED) {
            checkRestaurantOrOperator(order, user);
            order.accept();
        } else if (newStatus == OrderStatus.PREPARING) {
            checkRestaurantOrOperator(order, user);
            order.startPreparing();
        } else if (newStatus == OrderStatus.READY) {
            checkRestaurantOrOperator(order, user);
            order.markReady();
        } else
            throw new IllegalArgumentException("Error : cannot update order to status " + newStatus);
        return orderRepository.save(order);
    }

    @Transactional
    @Override
    public void cancelOrder(Long orderId, User user) {
        Order order = findOrderById(orderId);
        if (user.getRole() == Role.CUSTOMER) {
            if (!order.getCustomer().getUserId().equals(user.getUserId())) {
                throw new IllegalArgumentException("User does not have permission to cancel this order");
            }
            order.cancelByCustomer();
        } else if (user.getRole() == Role.OPERATOR) {
            order.cancelByOperator();
        } else
            throw new IllegalArgumentException("User does not have permission to cancel this order");
        orderRepository.save(order);
    }

    private void checkRestaurantOrOperator(Order order, User user) {
        if (user.getRole() == Role.OPERATOR)
            return;
        if (isRestaurantOwner(user, order.getRestaurant().getRestaurantId()))
            return;
        else
            throw new IllegalArgumentException("User does not have permission to perform this action");
    }

    private Order findOrderById(Long orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found"));
    }

    private boolean isRestaurantOwner(User user, Long restaurantId) {
        return user.getRole() == Role.RESTAURANT_OWNER
            && Objects.equals(((RestaurantOwner)user).getRestaurant().getRestaurantId(), restaurantId);
    }
}
