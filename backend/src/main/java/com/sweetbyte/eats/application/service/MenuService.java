package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.model.User;

import com.sweetbyte.eats.application.model.MenuItem;

import java.util.List;

public interface MenuService{

    //UC II - Browse
    List<MenuItem> getMenuForRestaurant(Long restaurantID);

    List<MenuItem> getAvailableMenu(Long restaurantID);

    MenuItem getMenuItemByID(Long menuItemID);

    //UC I - Manage Restaurant configuration
    MenuItem addMenuItem(Long restaurantID, String name, Double price, User user);

    MenuItem updateMenuItem(Long restaurantID, Long menuItemID, String name, Double price, User user);

    List<MenuItem> removeMenuItem(Long restaurantID, Long menuItemID, User user);

    MenuItem markSoldOut(Long restaurantID, Long menuItemID, User user);

    MenuItem markAvailable(Long restaurantID, Long menuItemID, User user);

}
