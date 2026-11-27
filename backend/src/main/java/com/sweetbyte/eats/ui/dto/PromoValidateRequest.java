package com.sweetbyte.eats.ui.dto;

import java.math.BigDecimal;

// POST /api/promo/validate: the code typed at checkout and the cart subtotal.
public record PromoValidateRequest(String code, BigDecimal subtotal) {}
