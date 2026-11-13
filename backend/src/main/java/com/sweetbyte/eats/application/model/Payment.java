package com.sweetbyte.eats.application.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.YearMonth;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * How the customer paid for one order (mock: no real payment provider is called).
 * Immutable value object stored inside Order, captured once when the order is placed.
 *
 * Only safe card details are kept: brand, last 4 digits, holder, expiry.
 * The full card number and CVV never reach the backend.
 * The amount is the fare total; BillingRecord stays the source of truth for the breakdown.
 *
 * Columns are nullable in the database because orders placed before payments
 * were wired have none; the constructor still requires every field.
 */
@Embeddable
public class Payment {

    @Column(name = "payment_method", updatable = false)
    private String method;

    @Column(name = "payment_card_brand", updatable = false)
    private String cardBrand;

    @Column(name = "payment_card_last4", length = 4, updatable = false)
    private String cardLast4;

    @Column(name = "payment_card_holder", updatable = false)
    private String cardHolder;

    @Column(name = "payment_card_exp_month", updatable = false)
    private Integer cardExpMonth;

    @Column(name = "payment_card_exp_year", updatable = false)
    private Integer cardExpYear;

    @Column(name = "payment_amount", precision = 10, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(name = "payment_paid_at", updatable = false)
    private Instant paidAt;

    // Stands in for the payment provider's transaction id.
    @Column(name = "payment_reference", updatable = false)
    private UUID reference;

    // Required by JPA. Not for our code.
    protected Payment() { }

    private Payment(String cardBrand, String cardLast4, String cardHolder,
                    int cardExpMonth, int cardExpYear, BigDecimal amount) {
        this.method = "CARD";
        this.cardBrand = requireText(cardBrand, "card brand");
        this.cardLast4 = requireLast4(cardLast4);
        this.cardHolder = requireText(cardHolder, "card holder");
        requireNotExpired(cardExpMonth, cardExpYear);
        this.cardExpMonth = cardExpMonth;
        this.cardExpYear = cardExpYear;
        Objects.requireNonNull(amount, "amount is required");
        if (amount.signum() <= 0) {
            throw new IllegalArgumentException("Payment amount must be positive");
        }
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
        this.paidAt = Instant.now();
        this.reference = UUID.randomUUID();
    }

    // Mock charge: always approved once the card details are valid.
    public static Payment card(String brand, String last4, String holder,
                               Integer expMonth, Integer expYear, BigDecimal amount) {
        if (expMonth == null || expYear == null) {
            throw new IllegalArgumentException("Card expiry is required");
        }
        return new Payment(brand, last4, holder, expMonth, expYear, amount);
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.trim();
    }

    private static String requireLast4(String last4) {
        if (last4 == null || !last4.matches("\\d{4}")) {
            throw new IllegalArgumentException("Card last 4 digits must be exactly 4 digits");
        }
        return last4;
    }

    private static void requireNotExpired(int month, int year) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Card expiry month must be between 1 and 12");
        }
        YearMonth now = YearMonth.now();
        if (YearMonth.of(year, month).isBefore(now)) {
            throw new IllegalArgumentException("Card is expired");
        }
    }

    // ---- getters ----
    public String getMethod()        { return method; }
    public String getCardBrand()     { return cardBrand; }
    public String getCardLast4()     { return cardLast4; }
    public String getCardHolder()    { return cardHolder; }
    public Integer getCardExpMonth() { return cardExpMonth; }
    public Integer getCardExpYear()  { return cardExpYear; }
    public BigDecimal getAmount()    { return amount; }
    public Instant getPaidAt()       { return paidAt; }
    public UUID getReference()       { return reference; }
}
