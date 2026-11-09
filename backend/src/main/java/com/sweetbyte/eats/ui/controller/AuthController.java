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

import com.sweetbyte.eats.application.service.AuthService;
import com.sweetbyte.eats.ui.dto.CourierMeResponse;
import com.sweetbyte.eats.ui.dto.CourierRegisterRequest;
import com.sweetbyte.eats.ui.dto.CustomerMeResponse;
import com.sweetbyte.eats.ui.dto.CustomerRegisterRequest;
import com.sweetbyte.eats.ui.dto.MeResponse;
import com.sweetbyte.eats.ui.dto.RestaurantOwnerMeResponse;
import com.sweetbyte.eats.ui.dto.RestaurantOwnerRegisterRequest;

//register (one endpoint per role), plus “who am I”
//all need a verified Supabase JWT (see SecurityConfig)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // POST /api/auth/register/customer  (after supabase.auth.signUp)
    @PostMapping("/register/customer")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerMeResponse registerCustomer(@AuthenticationPrincipal Jwt jwt,
                                               @RequestBody CustomerRegisterRequest body) {
        return CustomerMeResponse.from(authService.registerCustomer(
                supabaseUid(jwt), jwt.getClaimAsString("email"), body.name(), body.deliveryAddress()));
    }

    // POST /api/auth/register/restaurant-owner  (after supabase.auth.signUp)
    @PostMapping("/register/restaurant-owner")
    @ResponseStatus(HttpStatus.CREATED)
    public RestaurantOwnerMeResponse registerRestaurantOwner(@AuthenticationPrincipal Jwt jwt,
                                                             @RequestBody RestaurantOwnerRegisterRequest body) {
        return RestaurantOwnerMeResponse.from(authService.registerRestaurantOwner(
                supabaseUid(jwt), jwt.getClaimAsString("email"), body.name(), body.restaurantName()));
    }

    // POST /api/auth/register/courier  (after supabase.auth.signUp)
    @PostMapping("/register/courier")
    @ResponseStatus(HttpStatus.CREATED)
    public CourierMeResponse registerCourier(@AuthenticationPrincipal Jwt jwt,
                                             @RequestBody CourierRegisterRequest body) {
        return CourierMeResponse.from(authService.registerCourier(
                supabaseUid(jwt), jwt.getClaimAsString("email"), body.name()));
    }

    // Operators are staff: seeded only, no register endpoint

    // GET /api/auth/me  (after login: shape depends on the role, see MeResponse)
    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return MeResponse.from(authService.currentUser(supabaseUid(jwt)));
    }

    private static UUID supabaseUid(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
