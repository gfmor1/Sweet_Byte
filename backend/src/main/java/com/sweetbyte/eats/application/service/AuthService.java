package com.sweetbyte.eats.application.service;

import java.util.UUID;

import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import com.sweetbyte.eats.application.model.User;

// Resolves who is acting on a request, and creates accounts (one method per role).
// The JWT is already verified by Spring Security; its "sub" is the Supabase account id
// and its email is used as the account email.
public interface AuthService {
    User currentUser(UUID supabaseUid);

    Customer registerCustomer(UUID supabaseUid, String email, String name);

    // The owner registers together with a new restaurant
    RestaurantOwner registerRestaurantOwner(UUID supabaseUid, String email, String name, String restaurantName);

    Courier registerCourier(UUID supabaseUid, String email, String name);

    // Operators are staff: seeded only, never self-registered
}
