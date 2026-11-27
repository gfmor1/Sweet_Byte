package com.sweetbyte.eats.ui.dto;

//POST /api/auth/login
public record LoginRequest(String email, String password) {
}
