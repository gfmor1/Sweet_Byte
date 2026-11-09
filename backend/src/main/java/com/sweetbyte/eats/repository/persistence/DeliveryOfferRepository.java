package com.sweetbyte.eats.repository.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.sweetbyte.eats.application.enums.OfferStatus;
import com.sweetbyte.eats.application.model.DeliveryOffer;

public interface DeliveryOfferRepository extends JpaRepository<DeliveryOffer, Long> {

    // open-in-view is off: the courier's offer view and accept response read the whole order
    @EntityGraph(attributePaths = {"order", "order.restaurant", "order.customer", "order.courier",
            "order.lines", "order.lines.item"})
    Optional<DeliveryOffer> findFirstByCourierUserIdAndStatus(Long courierId, OfferStatus status);
    Optional<DeliveryOffer> findFirstByOrderOrderIdAndStatus(Long orderId, OfferStatus status);
    List<DeliveryOffer> findByOrderOrderId(Long orderId);
    List<DeliveryOffer> findByStatus(OfferStatus status);
}