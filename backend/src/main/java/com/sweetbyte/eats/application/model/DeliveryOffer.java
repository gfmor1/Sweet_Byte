package com.sweetbyte.eats.application.model;

import java.time.Instant;
import java.util.Objects;

import com.sweetbyte.eats.application.enums.OfferStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.exceptions.InvalidTransitionException;

import jakarta.persistence.*;


/**
 * A ready order offered to one courier by the dispatch rule (R-DLV-02),
 * stored so dispatch already knows who declined and who is waiting
 * to answer (UC-DLV-04, UC-DLV-05).
 */
@Entity
@Table(name = "delivery_offers")
public final class DeliveryOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long offerId;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, updatable = false)
    private Order order;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "courier_id", nullable = false, updatable = false)
    private Courier courier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OfferStatus status = OfferStatus.PENDING;

    @Column(nullable = false, updatable = false)
    private Instant offeredAt = Instant.now();

    protected DeliveryOffer() { }

    public DeliveryOffer(Order order, Courier courier) {
        this.order = Objects.requireNonNull(order);
        this.courier = Objects.requireNonNull(courier);
        if (order.getStatus() != OrderStatus.READY || order.getCourier() != null)   // R-DLV-01
            throw new IllegalStateException("Order " + order.getOrderId() + " is not ready to be offered");
        if (!courier.isAvailable())                                                  // R-DLV-02
            throw new IllegalStateException("Courier " + courier.getUserId() + " is not available");
    }

    public void accept()   { answer(OfferStatus.ACCEPTED); }
    public void decline()  { answer(OfferStatus.DECLINED); }
    public void withdraw() { answer(OfferStatus.WITHDRAWN); }

    private void answer(OfferStatus next) {
        if (status != OfferStatus.PENDING)
            throw new InvalidTransitionException("DeliveryOffer", offerId, status, next);
        status = next;
    }

    public Long getOfferId()       { return offerId; }
    public Order getOrder()        { return order; }
    public Long getOrderId()       { return order.getOrderId(); }
    public Courier getCourier()    { return courier; }
    public OfferStatus getStatus() { return status; }
    public Instant getOfferedAt()  { return offeredAt; }
}