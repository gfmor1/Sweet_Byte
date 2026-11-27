package com.sweetbyte.eats.ui.dto;

//returned by /api/auth/login and /api/auth/register/*:
//token = the JWT to send as "Authorization: Bearer <token>", user = same shape as GET /api/auth/me
public record AuthResponse(String token, MeResponse user) {
}
