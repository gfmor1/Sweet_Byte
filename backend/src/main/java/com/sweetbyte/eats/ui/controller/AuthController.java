package com.sweetbyte.eats.ui.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.service.AuthService;
import com.sweetbyte.eats.ui.dto.AuthResponse;
import com.sweetbyte.eats.ui.dto.CourierRegisterRequest;
import com.sweetbyte.eats.ui.dto.CustomerRegisterRequest;
import com.sweetbyte.eats.ui.dto.LoginRequest;
import com.sweetbyte.eats.ui.dto.MeResponse;
import com.sweetbyte.eats.ui.dto.RestaurantOwnerRegisterRequest;
import com.sweetbyte.eats.ui.security.TokenService;

//login, register (one endpoint per role), plus "who am I"
//login and register are public and return a JWT; /me needs that JWT (see SecurityConfig)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final TokenService tokenService;

    public AuthController(AuthService authService, TokenService tokenService) {
        this.authService = authService;
        this.tokenService = tokenService;
    }

    // POST /api/auth/login  (wrong email or password = 401)
    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest body) {
        return withToken(authService.login(body.email(), body.password()));
    }

    // POST /api/auth/register/customer
    @PostMapping("/register/customer")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerCustomer(@RequestBody CustomerRegisterRequest body) {
        return withToken(authService.registerCustomer(body.email(), body.password(), body.name()));
    }

    // POST /api/auth/register/restaurant-owner
    @PostMapping("/register/restaurant-owner")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerRestaurantOwner(@RequestBody RestaurantOwnerRegisterRequest body) {
        return withToken(authService.registerRestaurantOwner(
                body.email(), body.password(), body.name(), body.restaurantName()));
    }

    // POST /api/auth/register/courier
    @PostMapping("/register/courier")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerCourier(@RequestBody CourierRegisterRequest body) {
        return withToken(authService.registerCourier(body.email(), body.password(), body.name()));
    }

    // Operators are staff: seeded only, no register endpoint

    // GET /api/auth/me  (after login: shape depends on the role, see MeResponse)
    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return MeResponse.from(authService.currentUser(UUID.fromString(jwt.getSubject())));
    }

    private AuthResponse withToken(User user) {
        return new AuthResponse(tokenService.issue(user), MeResponse.from(user));
    }
}
