package com.sweetbyte.eats.application.service;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.stereotype.Service;

import com.sweetbyte.eats.application.exceptions.PromoRefusedException;
import com.sweetbyte.eats.application.model.PromoCode;
import com.sweetbyte.eats.application.model.PromoConfig;

@Service
public class PromoServiceImpl implements PromoService {

    private final PromoConfig promoConfig;

    public PromoServiceImpl(PromoConfig promoConfig) {
        this.promoConfig = promoConfig;
    }

    // R-PROMO-01: called from placeOrder, on the single code carried by the request.
    @Override
    public BigDecimal validate(String code, BigDecimal subtotal) {
        PromoCode promo = promoConfig.find(code)
                .orElseThrow(() -> new PromoRefusedException(
                        "Promo code " + code + " does not exist"));

        if (promo.isExpiredOn(LocalDate.now())) {                      // R-PROMO-02
            throw new PromoRefusedException("Promo code " + promo.getCode()
                    + " expired on " + promo.getExpiresOn());
        }
        if (!promo.meetsMinimum(subtotal)) {                           // R-PROMO-02
            throw new PromoRefusedException("Promo code " + promo.getCode()
                    + " requires a minimum order of " + promo.getMinimumOrderValue()
                    + ", your order is " + subtotal);
        }
        return promo.getDiscount();
    }
}