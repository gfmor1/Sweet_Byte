package com.sweetbyte.eats.application.exceptions;
//ordering from a paused or closed restaurant
public class RestaurantUnavailableException extends RuntimeException {

    public RestaurantUnavailableException(String message) {
        super(message);
    }

    public RestaurantUnavailableException(Object restaurantId, Enum<?> status) {
        super("Restaurant " + restaurantId + " is " + status + " and not accepting orders");
    }
}