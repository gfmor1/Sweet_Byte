package com.sweetbyte.eats.ui.dto;

//POST /api/auth/register/restaurant-owner (the owner registers together with their restaurant)
//email and Supabase id are NOT here: they come from the verified JWT, so they can't be faked
public record RestaurantOwnerRegisterRequest(String name, String restaurantName) {
}

//TODO: CourierRegisterRequest (couriers can't register yet)
//Operators are staff: seeded only, no register request
