package com.sweetbyte.eats.application.exceptions;

public class InvalidTransitionException extends RuntimeException {

    public InvalidTransitionException(String entity, Object id, Enum<?> from, Enum<?> to) {
        super(entity + " " + id + " cannot go from " + from + " to " + to);
    }
}