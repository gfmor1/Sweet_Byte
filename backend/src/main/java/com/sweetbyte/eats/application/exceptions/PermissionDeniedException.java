package com.sweetbyte.eats.application.exceptions;
//the user’s role or ownership doesn’t allow the action
public class PermissionDeniedException extends RuntimeException {

    public PermissionDeniedException(String message) {
        super(message);
    }

    public PermissionDeniedException(Object userId, String action) {
        super("User " + userId + " is not allowed to " + action);
    }
}