package com.sweetbyte.eats.repository.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sweetbyte.eats.application.model.Order;
//load and save orders
//the queue query (a restaurant’s ACCEPTED/PREPARING orders sorted by arrivalSeq)
//and the role-scoped lists (orders by customer, orders by restaurant)
public interface OrderRepository extends JpaRepository<Order, Long> {

    public List<Order> findByCustomerUserId(Long customerId);

    public List<Order> findByRestaurantId(Long restaurantId);
}
