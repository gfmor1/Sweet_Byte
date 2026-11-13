package com.sweetbyte.eats.application.pricing;

import java.util.Objects;

public abstract class FareCalculatorDecorator implements FareCalculator{

    protected final FareCalculator inner;

    protected FareCalculatorDecorator(FareCalculator inner){
        this.inner = Objects.requireNonNull(inner, "inner calculator is required");
    }
}
