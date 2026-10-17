package com.sweetbyte.eats.ui.controller;

import com.sweetbyte.eats.application.service.RestaurantService;
import com.sweetbyte.eats.ui.dto.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
//list and view restaurants, pause and reopen, view the preparation queue

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    private final RestaurantService restaurantService;

    public RestaurantController(RestaurantService restaurantService){
        this.restaurantService = restaurantService;
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
    public RestaurantResponse pause(@PathVariable Long restaurantId) {
        return RestaurantResponse.from(restaurantService.pauseRestaurant(restaurantId));
    }

    @PatchMapping("/{restaurantId}/reopen")
    public RestaurantResponse reopen(@PathVariable Long restaurantId) {
        return RestaurantResponse.from(restaurantService.reOpenRestaurant(restaurantId));
    }

    //UC I step 2
    @PatchMapping("/{restaurantId}/status")
    public RestaurantResponse changeStatus(@PathVariable Long restaurantId,
                                           @RequestBody ChangeStatusRequest body) {
        return RestaurantResponse.from(restaurantService.changeStatus(restaurantId, body.status()));
    }

    //UC IV step 14
    @GetMapping("/{restaurantId}/queue")
    public QueueResponse getQueue(@PathVariable Long restaurantId) {
        return QueueResponse.from(restaurantService.getPreparationQueue(restaurantId));
    }

    //UC VII
    @GetMapping("/{restaurantId}/queue/size")
    public Long getQueueSize(@PathVariable Long restaurantId) {
        return restaurantService.getQueueSize(restaurantId);
    }

    //UC IV step 12
    @PostMapping("/{restaurantId}/orders/{orderId}/accept")
    public ResponseEntity<Void> acceptOrder(@PathVariable Long restaurantId, @PathVariable Long orderId) {
        restaurantService.acceptOrder(restaurantId, orderId);
        return ResponseEntity.noContent().build();
    }

    //UC IV step 12 / UC V step 32
    @PostMapping("/{restaurantId}/orders/{orderId}/decline")
    public ResponseEntity<Void> declineOrder(@PathVariable Long restaurantId, @PathVariable Long orderId,
                                             @RequestBody DeclineOrderRequest body) {
        restaurantService.declineOrder(restaurantId, orderId, body.reason());
        return ResponseEntity.noContent().build();
    }
    
}
