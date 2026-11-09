package com.sweetbyte.eats.ui.dto;

import java.math.BigDecimal;

import com.sweetbyte.eats.application.model.MenuItem;
import com.sweetbyte.eats.application.enums.MenuItemStatus;

public record MenuItemResponse(Long menuItemID, Long restaurantID, String name, BigDecimal price, MenuItemStatus status) {
    public static MenuItemResponse from(MenuItem menuItem){
        return new MenuItemResponse(menuItem.getItemId(), menuItem.getRestaurant().getRestaurantId(), menuItem.getName(), menuItem.getPrice(), menuItem.getStatus());
    }
}
