package com.sweetbyte.eats.application.exceptions;
//the order contains a sold-out item (R-ORD-02)
public class ItemSoldOutException extends RuntimeException {

    public ItemSoldOutException(String message) {
        super(message);
    }

    public ItemSoldOutException(Object itemId, String itemName) {
        super("Menu item " + itemId + " (" + itemName + ") is sold out and cannot be ordered");
    }
}