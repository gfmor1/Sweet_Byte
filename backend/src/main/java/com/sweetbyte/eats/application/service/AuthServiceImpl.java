package com.sweetbyte.eats.application.service;

import java.util.Locale;
import java.util.UUID;

import org.hibernate.Hibernate;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
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

    private static final int MIN_PASSWORD_LENGTH = 6;
    // same message for "no such email" and "wrong password": do not reveal which emails exist
    private static final String INVALID_LOGIN = "Invalid login credentials";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    // compared against when the email is unknown, so both cases take the same (BCrypt) time
    private final String dummyHash;

    public AuthServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.dummyHash = passwordEncoder.encode("not-a-real-password");
    }

    // A valid token whose user no longer exists (e.g. database reset) = must log in again
    @Override
    @Transactional(readOnly = true)
    public User currentUser(UUID authUid) {
        User user = userRepository.findByAuthUid(authUid)
            .orElseThrow(() -> new PermissionDeniedException("No SweetByte account for this login, log in again"));
        return withRestaurantLoaded(user);
    }

    @Override
    @Transactional(readOnly = true)
    public User login(String email, String password) {
        if (email == null || password == null) throw new BadCredentialsException(INVALID_LOGIN);
        User user = userRepository.findByEmailIgnoreCase(email.trim()).orElse(null);
        String hash = user != null && user.getPasswordHash() != null ? user.getPasswordHash() : dummyHash;
        boolean matches = passwordEncoder.matches(password, hash);
        if (user == null || user.getPasswordHash() == null || !matches) throw new BadCredentialsException(INVALID_LOGIN);
        return withRestaurantLoaded(user);
    }

    @Override
    @Transactional
    public Customer registerCustomer(String email, String password, String name) {
        String normalized = requireNewEmail(email);
        Customer customer = new Customer(UUID.randomUUID(), name, normalized);
        customer.setPasswordHash(hash(password));
        return userRepository.save(customer);
    }

    @Override
    @Transactional
    public RestaurantOwner registerRestaurantOwner(String email, String password, String name, String restaurantName) {
        String normalized = requireNewEmail(email);
        // the new restaurant is saved by cascade with its owner and starts CLOSED
        Restaurant restaurant = new Restaurant(restaurantName, DEFAULT_LATITUDE, DEFAULT_LONGITUDE);
        RestaurantOwner owner = new RestaurantOwner(UUID.randomUUID(), name, normalized, restaurant);
        owner.setPasswordHash(hash(password));
        return userRepository.save(owner);
    }

    @Override
    @Transactional
    public Courier registerCourier(String email, String password, String name) {
        String normalized = requireNewEmail(email);
        Courier courier = new Courier(UUID.randomUUID(), name, normalized, DEFAULT_LATITUDE, DEFAULT_LONGITUDE);
        courier.setPasswordHash(hash(password));
        return userRepository.save(courier);
    }

    // users.email is unique; emails are stored trimmed and lower-case
    private String requireNewEmail(String email) {
        if (email == null || email.isBlank()) throw new IllegalArgumentException("email is required");
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmailIgnoreCase(normalized).isPresent())
            throw new IllegalStateException("Another SweetByte account already uses " + normalized + ", log in instead");
        return normalized;
    }

    private String hash(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH)
            throw new IllegalArgumentException("password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        return passwordEncoder.encode(password);
    }

    // the owner's restaurant is lazy; load it while the transaction is open
    private static User withRestaurantLoaded(User user) {
        if (user instanceof RestaurantOwner owner) Hibernate.initialize(owner.getRestaurant());
        return user;
    }
}
