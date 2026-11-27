package com.sweetbyte.eats.ui.dto;

//POST /api/auth/register/restaurant-owner (the owner registers together with their restaurant)
//public: creates the account and logs in
public record RestaurantOwnerRegisterRequest(String email, String password, String name, String restaurantName) {
}

//Operators are staff: seeded only, no register request
