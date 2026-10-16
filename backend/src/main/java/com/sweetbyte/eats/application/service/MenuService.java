package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.model.MenuItem;

import java.util.List;

public interface MenuService{

    //UC II - Browse
    List<MenuItem> getMenuForRestaurant(Long restaurantID);

    List<MenuItem> getAvailableMenu(Long restaurantID);

    //UC I - Manage Restaurant configuration
    MenuItem addMenuItem(Long restaurantID, String name, Double price);

    MenuItem updateMenuItem(Long restaurantID, Long menuItemID, String name, Double price);

    void removeMenuItem(Long restaurantID, Long menuItemID);

    MenuItem markSoldOut(Long restaurantID, Long menuItemID);

    MenuItem markAvailable(Long restaurantID, Long menuItemID);

}
