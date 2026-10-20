package com.sweetbyte.eats.repository.seed;

import java.util.List;

import com.sweetbyte.eats.application.enums.MenuItemStatus;
import com.sweetbyte.eats.application.enums.RestaurantStatus;

//Java records with the same shape as seed.json (users, restaurants, menu items, couriers), so the loader can read the file in one step.
//It’s the same idea as a DTO, but for the config file instead of HTTP.
public record SeedData(List<RestaurantSeed> restaurants,
                       List<CustomerSeed> customers,
                       List<CourierSeed> couriers,
                       List<OperatorSeed> operators) {

    // each restaurant comes with its owner (one owner per restaurant)
    // user passwords are the demo logins created in Supabase Auth (never stored in our DB)
    public record RestaurantSeed(String name, RestaurantStatus status, double latitude, double longitude,
                                 UserSeed owner, List<MenuItemSeed> menu) {}

    public record MenuItemSeed(String name, Double price, MenuItemStatus status) {}

    public record UserSeed(String name, String email, String password) {}

    public record CustomerSeed(String name, String email, String password,
                               String deliveryAddress, double latitude, double longitude) {}

    public record CourierSeed(String name, String email, String password,
                              double latitude, double longitude) {}

    public record OperatorSeed(String name, String email, String password) {}
}
