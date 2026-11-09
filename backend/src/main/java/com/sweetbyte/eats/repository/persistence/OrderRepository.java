package com.sweetbyte.eats.repository.persistence;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.sweetbyte.eats.application.model.Order;
//load and save orders
//the queue query (a restaurant’s ACCEPTED/PREPARING orders sorted by arrivalSeq)
//and the role-scoped lists (orders by customer, orders by restaurant)
//open-in-view is off, so OrderResponse.from() runs after the session closes:
//fetch what it reads (restaurant, lines, lines.item) up front to avoid LazyInitializationException
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Override
    @EntityGraph(attributePaths = {"restaurant", "courier", "lines", "lines.item"})
    public Optional<Order> findById(Long orderId);

    @EntityGraph(attributePaths = {"restaurant", "courier", "lines", "lines.item"})
    public List<Order> findByCustomerUserId(Long customerId);

    @EntityGraph(attributePaths = {"restaurant", "courier", "lines", "lines.item"})
    public List<Order> findByRestaurantRestaurantId(Long restaurantId);

    public List<Order> findByRestaurantRestaurantIdAndStatusOrderByArrivalSeqAsc(Long restaurantId, OrderStatus status);

    public Long countByRestaurantRestaurantIdAndStatus(Long restaurantId, OrderStatus status);

    public Optional<Order> findFirstByCourierUserIdAndStatusIn(Long userId, List<OrderStatus> held);

    public List<Order> findByStatusAndCourierIsNullOrderByReadyAtAscArrivalSeqAsc(OrderStatus status);

    public List<Order> findByStatusAndCourier_Status(OrderStatus ready, CourierStatus offline);

    // Delivery views also read the customer (drop-off position, name)
    @EntityGraph(attributePaths = {"restaurant", "customer", "courier", "lines", "lines.item"})
    public Optional<Order> findWithDeliveryDetailsByOrderId(Long orderId);

    // At most one, because a courier holds at most one order (R-DLV-03)
    @EntityGraph(attributePaths = {"restaurant", "customer", "courier", "lines", "lines.item"})
    public Optional<Order> findByCourierUserIdAndStatusIn(Long courierId, Collection<OrderStatus> statuses);

    @EntityGraph(attributePaths = {"restaurant", "customer", "courier", "lines", "lines.item"})
    public List<Order> findAllByOrderByOrderIdDesc();

    public List<Order> findByStatusAndCourierIsNullOrderByReadyAtAsc(OrderStatus status);
}
