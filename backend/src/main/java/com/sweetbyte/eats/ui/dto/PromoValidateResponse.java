package com.sweetbyte.eats.ui.dto;

import java.math.BigDecimal;

// The accepted code (normalised) and the discount it gives.
public record PromoValidateResponse(String code, BigDecimal discount) {}
