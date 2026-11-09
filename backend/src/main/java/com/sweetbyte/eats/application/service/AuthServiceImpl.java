package com.sweetbyte.eats.application.service;

import java.util.UUID;

import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.UserRepository;

@Service
public class AuthServiceImpl implements AuthService {

    // TODO: no geocoding yet, new customers/restaurants/couriers start at the city centre (Montreal)
    private static final double DEFAULT_LATITUDE = 45.5017;
    private static final double DEFAULT_LONGITUDE = -73.5673;

    private final UserRepository userRepository;

    public AuthServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // A valid Supabase token without a matching users row = logged in but never registered here
    @Override
    @Transactional(readOnly = true)
    public User currentUser(UUID supabaseUid) {
        User user = userRepository.findBySupabaseUid(supabaseUid)
            .orElseThrow(() -> new PermissionDeniedException("No SweetByte account for this login, register first"));
        // the owner's restaurant is lazy; load it while the transaction is open
        if (user instanceof RestaurantOwner owner) Hibernate.initialize(owner.getRestaurant());
        return user;
    }

    @Override
    @Transactional
    public Customer registerCustomer(UUID supabaseUid, String email, String name, String deliveryAddress) {
        requireNotRegistered(supabaseUid, email);
        return userRepository.save(new Customer(supabaseUid, name, email,
                deliveryAddress, DEFAULT_LATITUDE, DEFAULT_LONGITUDE));
    }

    @Override
    @Transactional
    public RestaurantOwner registerRestaurantOwner(UUID supabaseUid, String email, String name, String restaurantName) {
        requireNotRegistered(supabaseUid, email);
        // the new restaurant is saved by cascade with its owner and starts CLOSED
        Restaurant restaurant = new Restaurant(restaurantName, DEFAULT_LATITUDE, DEFAULT_LONGITUDE);
        return userRepository.save(new RestaurantOwner(supabaseUid, name, email, restaurant));
    }

    @Override
    @Transactional
    public Courier registerCourier(UUID supabaseUid, String email, String name) {
        requireNotRegistered(supabaseUid, email);
        return userRepository.save(new Courier(supabaseUid, name, email, DEFAULT_LATITUDE, DEFAULT_LONGITUDE));
    }

    // Registering is one-time: refuse if this Supabase login already has a SweetByte account,
    // or if another account already uses the token's email (users.email is unique)
    private void requireNotRegistered(UUID supabaseUid, String email) {
        if (userRepository.findBySupabaseUid(supabaseUid).isPresent())
            throw new IllegalStateException("You already have a SweetByte account, log in instead");
        if (userRepository.existsByEmail(email))
            throw new IllegalStateException("Another SweetByte account already uses " + email);
    }
}
