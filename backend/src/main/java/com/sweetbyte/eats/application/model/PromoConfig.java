package com.sweetbyte.eats.application.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * The promo codes read from the configuration file (R-PROMO-02 values).
 * Never hard-code these values.
 */
public final class PromoConfig {

    private final List<PromoCode> codes;

    public PromoConfig(List<PromoCode> codes) {
        this.codes = (codes == null) ? List.of() : List.copyOf(codes);
    }

    /**
     * Parses one configuration line of the form
     *   CODE:discount:expiry:minimum, CODE:discount:expiry:minimum, ...
     * for example  WELCOME5:5.00:2026-12-31:25.00
     */
    public static PromoConfig parse(String configured) {
        List<PromoCode> parsed = new ArrayList<>();
        if (configured != null && !configured.isBlank()) {
            for (String entry : configured.split(",")) {
                String[] field = entry.trim().split(":");
                if (field.length != 4) {
                    throw new IllegalArgumentException("Bad promo code entry: " + entry);
                }
                parsed.add(new PromoCode(field[0], new BigDecimal(field[1]),
                        LocalDate.parse(field[2]), new BigDecimal(field[3])));
            }
        }
        return new PromoConfig(parsed);
    }

    public Optional<PromoCode> find(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        String wanted = code.trim().toUpperCase();
        return codes.stream().filter(c -> c.getCode().equals(wanted)).findFirst();
    }

    public List<PromoCode> getCodes() { return codes; }
}