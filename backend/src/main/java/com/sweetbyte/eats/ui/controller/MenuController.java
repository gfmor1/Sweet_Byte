package com.sweetbyte.eats.ui.controller;

import com.sweetbyte.eats.application.service.MenuService;
import com.sweetbyte.eats.ui.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
//browse a menu, add and edit items, mark items sold out or available

@RestController
@RequestMapping("/api/restaurants/{restaurantId}/menu")
public class MenuController {


    private final MenuService menuService;

    public MenuController(MenuService menuService){
        this.menuService = menuService;
    }

    @GetMapping
    public List<MenuItemResponse> getMenu(@PathVariable Long restaurantId) {
        return menuService.getMenuForRestaurant(restaurantId).stream().map(MenuItemResponse::from).toList();
    }

    @GetMapping("/available")
    public List<MenuItemResponse> getAvailable(@PathVariable Long restaurantId) {
        return menuService.getAvailableMenu(restaurantId).stream().map(MenuItemResponse::from).toList();
    }

    @GetMapping("/{itemId}")
    public MenuItemResponse getItem(@PathVariable Long restaurantId, @PathVariable Long itemId) {
        return MenuItemResponse.from(menuService.getMenuItemByID(itemId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MenuItemResponse add(@PathVariable Long restaurantId, @RequestBody MenuItemRequest body) {
        return MenuItemResponse.from(menuService.addMenuItem(restaurantId, body.name(), body.price()));
    }

    @PutMapping("/{itemId}")
    public MenuItemResponse update(@PathVariable Long restaurantId, @PathVariable Long itemId,
                                   @RequestBody MenuItemRequest body) {
        return MenuItemResponse.from(menuService.updateMenuItem(restaurantId, itemId, body.name(), body.price()));
    }

    @DeleteMapping("/{itemId}")
    public List<MenuItemResponse> remove(@PathVariable Long restaurantId, @PathVariable Long itemId) {
        return menuService.removeMenuItem(restaurantId, itemId).stream().map(MenuItemResponse::from).toList();
    }

    @PatchMapping("/{itemId}/sold-out")
    public MenuItemResponse markSoldOut(@PathVariable Long restaurantId, @PathVariable Long itemId) {
        return MenuItemResponse.from(menuService.markSoldOut(restaurantId, itemId));
    }

    @PatchMapping("/{itemId}/available")
    public MenuItemResponse markAvailable(@PathVariable Long restaurantId, @PathVariable Long itemId) {
        return MenuItemResponse.from(menuService.markAvailable(restaurantId, itemId));
    }


}
