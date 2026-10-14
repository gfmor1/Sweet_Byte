package com.sweetbyte.eats.application.exceptions;
//the order, restaurant, item or user doesn’t exist 
public class NotFoundException extends RuntimeException{
    public NotFoundException(String message){ super(message);};
}
