package com.sweetbyte.eats.repository.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sweetbyte.eats.application.enums.RefundRequestStatus;
import com.sweetbyte.eats.application.model.RefundRequest;

// Customers' refund requests (Refund Request module). One per order.
// The role-scoped finders back each role's view: customer, restaurant dashboard, operator queue.
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    Optional<RefundRequest> findByOrderId(Long orderId);

    boolean existsByOrderId(Long orderId);

    List<RefundRequest> findByStatusOrderByRequestedAtAsc(RefundRequestStatus status);   // operator queue, oldest first

    List<RefundRequest> findAllByOrderByRequestedAtDesc();                                // operator

    List<RefundRequest> findByCustomerIdOrderByRequestedAtDesc(Long customerId);          // customer

    List<RefundRequest> findByRestaurantIdOrderByRequestedAtDesc(Long restaurantId);      // restaurant
}
