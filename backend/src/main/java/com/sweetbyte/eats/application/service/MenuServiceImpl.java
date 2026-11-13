package com.sweetbyte.eats.application.service;

import java.math.BigDecimal;

import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.enums.MenuItemStatus;
import com.sweetbyte.eats.application.model.MenuItem;
import com.sweetbyte.eats.application.model.Order;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.permission.OrderPermissionResolver;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;
import com.sweetbyte.eats.repository.persistence.MenuItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class MenuServiceImpl implements MenuService{

    private final RestaurantRepository restaurantRepository;
    private final MenuItemRepository menuItemRepository;
    private final EventService eventService;
    private final OrderPermissionResolver permissionResolver;

    public MenuServiceImpl(RestaurantRepository restaurantRepository, MenuItemRepository menuItemRepository,
                           EventService eventService, OrderPermissionResolver permissionResolver){
        this.eventService = eventService;
        this.permissionResolver = permissionResolver;
        this.restaurantRepository = restaurantRepository;
        this.menuItemRepository = menuItemRepository;
    }


    //helper method to load the restaurant
    private Restaurant loadRestaurant(Long restaurantID){
        return restaurantRepository.findById(restaurantID)
                .orElseThrow(() -> new NotFoundException("Restaurant not found with ID: " + restaurantID));
    }

    //helper method to load the menu item
    private MenuItem loadOwnedMenuItem(Long restaurantID, Long menuItemID){
       MenuItem menuItem = getMenuItemByID(menuItemID);
       if(!menuItem.getRestaurant().getRestaurantId().equals(restaurantID)){
           throw new PermissionDeniedException("Menu item: " + menuItemID + "does not belong to restaurant" + restaurantID);
       }
       return menuItem;
    }

    //helper method to change to menu item status
    private MenuItem changeItemStatus(Long restaurantID, Long menuItemID, MenuItemStatus status, User user){
        permissionResolver.requireManageRestaurant(user, restaurantID); //refactored with strategy method
        //Load the menuItem
        MenuItem menuItem = loadOwnedMenuItem(restaurantID, menuItemID);
        //change the status
        MenuItemStatus from = menuItem.getStatus();
        menuItem.setStatus(status);
        MenuItem saved = menuItemRepository.save(menuItem);
        eventService.record("MenuItem", saved.getItemId(), from, status, user, null);
        return saved;
   }

    @Override
    public List<MenuItem> getMenuForRestaurant(Long restaurantID){
        //first load the restaurant so exception for bad IDs can be thrown
        loadRestaurant(restaurantID);
        //return the menu
        return menuItemRepository.findByRestaurantRestaurantId(restaurantID);
    }

    @Override
    public List<MenuItem> getAvailableMenu(Long restaurantID) {
        //first load the restaurant so exception for bad IDs can be thrown
        loadRestaurant(restaurantID);
        //return only available items
        return menuItemRepository.findByRestaurantRestaurantIdAndStatus(restaurantID, MenuItemStatus.AVAILABLE);
    }

    @Override
    public MenuItem getMenuItemByID(Long menuItemID){
        return menuItemRepository.findById(menuItemID)
                .orElseThrow(()-> new NotFoundException("Menu item not found with ID: " + menuItemID));
    }

    @Override
    public MenuItem addMenuItem(Long restaurantID, String name, BigDecimal price, User user){
        permissionResolver.requireManageRestaurant(user, restaurantID); //refactored with strategy method
        //Load the restaurant where the item belongs to
        Restaurant restaurant = loadRestaurant(restaurantID);

        //new items start with AVAILABLE
        MenuItem menuItem = new MenuItem(restaurant, name, price, MenuItemStatus.AVAILABLE);

        MenuItem saved = menuItemRepository.save(menuItem);
        eventService.record("MenuItem", saved.getItemId(), null, saved.getStatus(), user, null);
        return saved;

    }

    @Override
    public MenuItem updateMenuItem(Long restaurantID, Long menuItemID, String name, BigDecimal price, User user){
        permissionResolver.requireManageRestaurant(user, restaurantID); //refactored with strategy method
        //Load menu item and make sure it belongs to the restaurant
        MenuItem menuItem = loadOwnedMenuItem(restaurantID, menuItemID);

        //Only update the field given
        if(name != null){
            menuItem.setName(name);
        }
        if(price != null){
            menuItem.setPrice(price);
        }

        //TODO: record MenuItemUpdated event
        //save to the repository
        return menuItemRepository.save(menuItem);
    }

    @Override
    public List<MenuItem> removeMenuItem(Long restaurantID, Long menuItemID, User user){
        permissionResolver.requireManageRestaurant(user, restaurantID); //refactored with strategy method
        //Load menu item and make sure it belongs to the restaurant
        MenuItem menuItem = loadOwnedMenuItem(restaurantID, menuItemID);

        //remove the item from the repository
        menuItemRepository.delete(menuItem);

        //TODO: record MenuItemRemoved event
        /*TODO: block removing an item that is already in an order (OrderLine has
        a Foreign key to it)
         1. OrderRepository: boolean existsByLinesItemItemId(Long itemId);
        2. Inject OrderRepository in this class
        3. Here: if (orderRepository.existsByLinesItemItemId(menuItemID))
                    throw new IllegalStateException("Menu item is part of existing orders, mark it as sold out instead");
         Until then, deleting an ordered item fails with a DB constraint error**/

        //return the updated menu
        return menuItemRepository.findByRestaurantRestaurantId(restaurantID);

    }

    @Override
    public MenuItem markSoldOut(Long restaurantID, Long menuItemID, User user){
        //change the status to SOLD_OUT with helper and return the updated item
        return changeItemStatus(restaurantID, menuItemID, MenuItemStatus.SOLD_OUT, user);
    }

    @Override
    public MenuItem markAvailable(Long restaurantID, Long menuItemID, User user){
        //change the status to AVAILABLE with helper and return the updated item
        return changeItemStatus(restaurantID, menuItemID, MenuItemStatus.AVAILABLE, user);
    }


}
