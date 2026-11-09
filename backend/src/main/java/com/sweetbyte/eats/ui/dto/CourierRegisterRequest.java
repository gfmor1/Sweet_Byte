package com.sweetbyte.eats.ui.dto;

//POST /api/auth/register/courier
//email and Supabase id are NOT here: they come from the verified JWT, so they can't be faked
public record CourierRegisterRequest(String name) {
}
