package com.sweetbyte.eats.application.exceptions;
//the user’s role or ownership doesn’t allow the action
public class PermissionDeniedException extends RuntimeException {
    public PermissionDeniedException(String message){ super(message); }
}
