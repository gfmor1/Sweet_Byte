package com.sweetbyte.eats.ui.dto;

//POST /api/auth/register/courier (public: creates the account and logs in)
public record CourierRegisterRequest(String email, String password, String name) {
}
