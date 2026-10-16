package com.sweetbyte.eats.application.exceptions;
//the order, restaurant, item or user doesn’t exist
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }

    public NotFoundException(String entity, Object id) {
        super(entity + " " + id + " not found");
    }
}