package com.sweetbyte.eats.application.enums;

// Colour band of a restaurant marker on the map (R-DASH-03).
public enum QueueBand {
    SHORT,      // green: 0-2 queued
    BUILDING,   // amber: 3-5 queued
    LONG;       // red: 6+ queued, or the restaurant is paused

    public static final int BUILDING_AT = 3;
    public static final int LONG_AT = 6;

    public static QueueBand of(int queuedOrders, boolean paused) {
        if (queuedOrders < 0) {
            throw new IllegalArgumentException("queuedOrders must not be negative");
        }
        if (paused || queuedOrders >= LONG_AT) return LONG;
        if (queuedOrders >= BUILDING_AT) return BUILDING;
        return SHORT;
    }
}
