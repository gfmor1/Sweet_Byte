package com.sweetbyte.eats.repository.seed;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.MenuItem;
import com.sweetbyte.eats.application.model.Operator;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.CourierRepository;
import com.sweetbyte.eats.repository.persistence.MenuItemRepository;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;
import com.sweetbyte.eats.repository.persistence.UserRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import tools.jackson.databind.ObjectMapper;

//runs at startup, reads the seed file and fills the database
//Make it skip records that already exist, so restarting doesn’t create duplicates.
//Matching keys: users by email, restaurants by name, menu items by restaurant + name.
@Component
public class SeedDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);
    private static final String SEED_FILE = "seed/seed.json";

    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final RestaurantRepository restaurantRepository;
    private final MenuItemRepository menuItemRepository;
    private final PasswordEncoder passwordEncoder;
    private final CourierRepository courierRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public SeedDataLoader(ObjectMapper objectMapper, UserRepository userRepository,
                          RestaurantRepository restaurantRepository, MenuItemRepository menuItemRepository,
                          PasswordEncoder passwordEncoder, CourierRepository courierRepository) {
        this.passwordEncoder = passwordEncoder;
        this.courierRepository = courierRepository;
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
        this.restaurantRepository = restaurantRepository;
        this.menuItemRepository = menuItemRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        seedMissing(readSeed());
    }

    // Reset (R-DASH, operator only): returns the system to the state described by seed.json.
    // 1. wipes every order and everything derived from it (offers, ledger, billing, refunds, events)
    // 2. puts seeded restaurants, menus and couriers back to their seeded values
    // 3. re-creates any seeded record (incl. accounts) that was deleted
    // Accounts registered at runtime are kept; their couriers go back OFFLINE (they hold no order anymore).
    @Transactional
    public void resetToSeed() throws IOException {
        SeedData seed = readSeed();

        // Native TRUNCATE: one statement, no FK ordering issues (ledger refunds point to ledger charges).
        // RESTART IDENTITY so order ids start again at 1. No CASCADE: fails loudly if another table depends on these.
        entityManager.createNativeQuery("TRUNCATE TABLE ledger_entry_timestamps, ledger_entries, billing_records, "
                + "refund_requests, delivery_offers, domain_events, order_lines, orders RESTART IDENTITY").executeUpdate();
        entityManager.clear(); // drop any cached entity that pointed to a deleted row

        for (SeedData.RestaurantSeed r : seed.restaurants()) {
            restaurantRepository.findByName(r.name()).ifPresent(restaurant -> {
                restaurant.resetTo(r.status(), r.latitude(), r.longitude());
                Map<String, SeedData.MenuItemSeed> seeded = new HashMap<>();
                for (SeedData.MenuItemSeed item : r.menu()) seeded.put(item.name(), item);
                for (MenuItem item : menuItemRepository.findByRestaurantRestaurantId(restaurant.getRestaurantId())) {
                    SeedData.MenuItemSeed s = seeded.get(item.getName());
                    if (s == null) {
                        menuItemRepository.delete(item); // added after the seed
                    } else {
                        item.setPrice(s.price());
                        item.setStatus(s.status());
                    }
                }
            });
        }

        Map<String, SeedData.CourierSeed> seededCouriers = new HashMap<>();
        for (SeedData.CourierSeed c : seed.couriers()) seededCouriers.put(c.email(), c);
        for (Courier courier : courierRepository.findAll()) {
            SeedData.CourierSeed s = seededCouriers.get(courier.getEmail());
            double lat = s != null ? s.latitude() : courier.getLatitude();
            double lon = s != null ? s.longitude() : courier.getLongitude();
            courier.resetTo(CourierStatus.OFFLINE, lat, lon); // seeded couriers start off duty
        }

        entityManager.flush();
        seedMissing(seed);
        log.info("System reset to the initial state of {}", SEED_FILE);
    }

    private SeedData readSeed() throws IOException {
        try (InputStream in = new ClassPathResource(SEED_FILE).getInputStream()) {
            return objectMapper.readValue(in, SeedData.class);
        }
    }

    private void seedMissing(SeedData seed) {
        int created = 0;
        for (SeedData.RestaurantSeed r : seed.restaurants()) created += seedRestaurant(r);

        for (SeedData.CustomerSeed c : seed.customers()) {
            if (existingUser(c.email(), c.password())) continue;
            userRepository.save(withPassword(new Customer(UUID.randomUUID(), c.name(), c.email()), c.password()));
            created++;
        }

        for (SeedData.CourierSeed c : seed.couriers()) {
            if (existingUser(c.email(), c.password())) continue;
            userRepository.save(withPassword(new Courier(UUID.randomUUID(), c.name(), c.email(),
                    c.latitude(), c.longitude()), c.password()));
            created++;
        }

        for (SeedData.OperatorSeed o : seed.operators()) {
            if (existingUser(o.email(), o.password())) continue;
            userRepository.save(withPassword(new Operator(UUID.randomUUID(), o.name(), o.email()), o.password()));
            created++;
        }

        log.info("Seed data loaded from {}: {} new records", SEED_FILE, created);
    }

    private int seedRestaurant(SeedData.RestaurantSeed r) {
        int created = 0;

        Restaurant restaurant = restaurantRepository.findByName(r.name()).orElse(null);
        if (restaurant == null) {
            restaurant = new Restaurant(r.name(), r.latitude(), r.longitude());
            restaurant.changeStatus(r.status());
            restaurant = restaurantRepository.save(restaurant);
            created++;
        }

        // One owner per restaurant: skip if this email or this restaurant already has one
        if (r.owner() != null
                && !existingUser(r.owner().email(), r.owner().password())
                && !userRepository.existsOwnerForRestaurant(restaurant.getRestaurantId())) {
            userRepository.save(withPassword(new RestaurantOwner(UUID.randomUUID(),
                    r.owner().name(), r.owner().email(), restaurant), r.owner().password()));
            created++;
        }

        for (SeedData.MenuItemSeed item : r.menu()) {
            if (menuItemRepository.existsByRestaurantRestaurantIdAndName(restaurant.getRestaurantId(), item.name()))
                continue;
            menuItemRepository.save(new MenuItem(restaurant, item.name(), item.price(), item.status()));
            created++;
        }

        return created;
    }

    private <T extends User> T withPassword(T user, String password) {
        user.setPasswordHash(passwordEncoder.encode(password));
        return user;
    }

    // true if a seeded account with this email exists. Accounts created before local login
    // (Supabase Auth era) have no password hash: give them the seeded one so they can log in.
    private boolean existingUser(String email, String password) {
        return userRepository.findByEmailIgnoreCase(email).map(user -> {
            if (user.getPasswordHash() == null) withPassword(user, password); // saved at commit (managed entity)
            return true;
        }).orElse(false);
    }
}
