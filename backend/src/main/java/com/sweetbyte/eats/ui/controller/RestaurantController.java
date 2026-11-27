package com.sweetbyte.eats.ui.controller;

import com.sweetbyte.eats.application.service.RestaurantService;
import com.sweetbyte.eats.ui.dto.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.service.AuthService;
//list and view restaurants, pause and reopen, view the preparation queue

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    private final RestaurantService restaurantService;
    private final AuthService authService;

    public RestaurantController(RestaurantService restaurantService, AuthService authService){
        this.restaurantService = restaurantService;
        this.authService = authService;
    }

    //UC II steps 3-4
    @GetMapping
    public List<RestaurantResponse> getAll() {
        return restaurantService.getAllRestaurants().stream().map(RestaurantResponse::from).toList();
    }

    //UC II step 5
    @GetMapping("/{restaurantId}")
    public RestaurantResponse getById(@PathVariable Long restaurantId) {
        return RestaurantResponse.from(restaurantService.getRestaurantByID(restaurantId));
    }

    //UC VII step 37
    @PatchMapping("/{restaurantId}/pause")
    public RestaurantResponse pause(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId) {
        return RestaurantResponse.from(restaurantService.pauseRestaurant(restaurantId, currentUser(jwt)));
    }

    @PatchMapping("/{restaurantId}/reopen")
    public RestaurantResponse reopen(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId) {
        return RestaurantResponse.from(restaurantService.reOpenRestaurant(restaurantId, currentUser(jwt)));
    }

    // UC I: the owner sets the restaurant's address
    // body: { "address": "...", "latitude": 45.497, "longitude": -73.579 }
    @PatchMapping("/{restaurantId}/location")
    public RestaurantResponse relocate(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId,
                                       @RequestBody RestaurantLocationRequest body) {
        if (body == null || body.latitude() == null || body.longitude() == null)
            throw new IllegalArgumentException("An address with its coordinates is required");
        return RestaurantResponse.from(restaurantService.relocateRestaurant(
                restaurantId, body.address(), body.latitude(), body.longitude(), currentUser(jwt)));
    }

    //UC I step 2
    @PatchMapping("/{restaurantId}/status")
    public RestaurantResponse changeStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId,
                                           @RequestBody ChangeStatusRequest body) {
        return RestaurantResponse.from(restaurantService.changeStatus(restaurantId, body.status(), currentUser(jwt)));
    }

    //UC IV step 14
    @GetMapping("/{restaurantId}/queue")
    public QueueResponse getQueue(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId) {
        return QueueResponse.from(restaurantService.getPreparationQueue(restaurantId, currentUser(jwt)));
    }

    //UC VII
    @GetMapping("/{restaurantId}/queue/size")
    public Long getQueueSize(@AuthenticationPrincipal Jwt jwt, @PathVariable Long restaurantId) {
        return restaurantService.getQueueSize(restaurantId, currentUser(jwt));
    }

    // accept / decline: see OrderController (PATCH /api/orders/{id}/status, POST /api/orders/{id}/reject)

    // the verified JWT's sub (the user's authUid) -> our User
    private User currentUser(Jwt jwt) {
        return authService.currentUser(UUID.fromString(jwt.getSubject()));
    }
}
