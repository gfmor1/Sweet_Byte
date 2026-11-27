package com.sweetbyte.eats.application.service;

import java.util.UUID;

import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import com.sweetbyte.eats.application.model.User;

// Accounts and login, handled by this backend (no external auth provider).
// Register/login return the User; the UI layer turns it into a signed JWT (TokenService).
// On later requests Spring Security verifies that JWT, and its "sub" (the user's authUid)
// is resolved back to the User with currentUser.
public interface AuthService {
    User currentUser(UUID authUid);

    // Checks email + password; throws BadCredentialsException (401) when they do not match
    User login(String email, String password);

    Customer registerCustomer(String email, String password, String name);

    // The owner registers together with a new restaurant
    RestaurantOwner registerRestaurantOwner(String email, String password, String name, String restaurantName);

    Courier registerCourier(String email, String password, String name);

    // Operators are staff: seeded only, never self-registered
}
