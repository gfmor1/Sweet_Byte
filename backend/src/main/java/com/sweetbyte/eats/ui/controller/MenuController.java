package com.sweetbyte.eats.ui.controller;

import com.sweetbyte.eats.application.service.MenuService;
import com.sweetbyte.eats.ui.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.service.AuthService;
//browse a menu, add and edit items, mark items sold out or available

@RestController
@RequestMapping("/api/restaurants/{restaurantId}/menu")
public class MenuController {


    private final MenuService menuService;
    private final AuthService authService;

    public MenuController(MenuService menuService, AuthService authService){
        this.menuService = menuService;
        this.authService = authService;
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
    public MenuItemResponse add(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId, @RequestBody MenuItemRequest body) {
        return MenuItemResponse.from(menuService.addMenuItem(restaurantId, body.name(), body.price(), currentUser(jwt)));
    }

    @PutMapping("/{itemId}")
    public MenuItemResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId, @PathVariable Long itemId,
                                   @RequestBody MenuItemRequest body) {
        return MenuItemResponse.from(menuService.updateMenuItem(restaurantId, itemId, body.name(), body.price(), currentUser(jwt)));
    }

    @DeleteMapping("/{itemId}")
    public List<MenuItemResponse> remove(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId, @PathVariable Long itemId) {
        return menuService.removeMenuItem(restaurantId, itemId, currentUser(jwt)).stream().map(MenuItemResponse::from).toList();
    }

    @PatchMapping("/{itemId}/sold-out")
    public MenuItemResponse markSoldOut(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId, @PathVariable Long itemId) {
        return MenuItemResponse.from(menuService.markSoldOut(restaurantId, itemId, currentUser(jwt)));
    }

    @PatchMapping("/{itemId}/available")
    public MenuItemResponse markAvailable(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId, @PathVariable Long itemId) {
        return MenuItemResponse.from(menuService.markAvailable(restaurantId, itemId, currentUser(jwt)));
    }

    // the verified JWT's sub (the user's authUid) -> our User
    private User currentUser(Jwt jwt) {
        return authService.currentUser(UUID.fromString(jwt.getSubject()));
    }
}
