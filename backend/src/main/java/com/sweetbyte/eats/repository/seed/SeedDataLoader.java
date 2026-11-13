package com.sweetbyte.eats.repository.seed;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Customer;
import com.sweetbyte.eats.application.model.MenuItem;
import com.sweetbyte.eats.application.model.Operator;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.application.model.RestaurantOwner;
import com.sweetbyte.eats.repository.persistence.MenuItemRepository;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;
import com.sweetbyte.eats.repository.persistence.UserRepository;
import com.sweetbyte.eats.repository.supabase.SupabaseAuthAdminClient;

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
    private final SupabaseAuthAdminClient supabaseAdmin;

    public SeedDataLoader(ObjectMapper objectMapper, UserRepository userRepository,
                          RestaurantRepository restaurantRepository, MenuItemRepository menuItemRepository,
                          SupabaseAuthAdminClient supabaseAdmin) {
        this.supabaseAdmin = supabaseAdmin;
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
        this.restaurantRepository = restaurantRepository;
        this.menuItemRepository = menuItemRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        SeedData seed;
        try (InputStream in = new ClassPathResource(SEED_FILE).getInputStream()) {
            seed = objectMapper.readValue(in, SeedData.class);
        }

        // Users need a Supabase Auth account first; without the service-role key only
        // restaurants and menus are seeded (users are added on a later run that has it).
        boolean seedUsers = supabaseAdmin.isConfigured();
        if (!seedUsers) {
            log.warn("supabase.service-role-key not set: skipping seeded users");
        }

        int created = 0;
        for (SeedData.RestaurantSeed r : seed.restaurants()) created += seedRestaurant(r, seedUsers);

        if (seedUsers) {
            for (SeedData.CustomerSeed c : seed.customers()) {
                if (userRepository.existsByEmail(c.email())) continue;
                userRepository.save(new Customer(authAccount(c.email(), c.password()), c.name(), c.email()));
                created++;
            }

            for (SeedData.CourierSeed c : seed.couriers()) {
                if (userRepository.existsByEmail(c.email())) continue;
                userRepository.save(new Courier(authAccount(c.email(), c.password()), c.name(), c.email(),
                        c.latitude(), c.longitude()));
                created++;
            }

            for (SeedData.OperatorSeed o : seed.operators()) {
                if (userRepository.existsByEmail(o.email())) continue;
                userRepository.save(new Operator(authAccount(o.email(), o.password()), o.name(), o.email()));
                created++;
            }
        }

        log.info("Seed data loaded from {}: {} new records", SEED_FILE, created);
    }

    private int seedRestaurant(SeedData.RestaurantSeed r, boolean seedUsers) {
        int created = 0;

        Restaurant restaurant = restaurantRepository.findByName(r.name()).orElse(null);
        if (restaurant == null) {
            restaurant = new Restaurant(r.name(), r.latitude(), r.longitude());
            restaurant.changeStatus(r.status());
            restaurant = restaurantRepository.save(restaurant);
            created++;
        }

        // One owner per restaurant: skip if this email or this restaurant already has one
        if (seedUsers && r.owner() != null
                && !userRepository.existsByEmail(r.owner().email())
                && !userRepository.existsOwnerForRestaurant(restaurant.getRestaurantId())) {
            userRepository.save(new RestaurantOwner(authAccount(r.owner().email(), r.owner().password()),
                    r.owner().name(), r.owner().email(), restaurant));
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

    // Creates (or finds) the user's Supabase Auth account; its id becomes users.supabase_uid
    private UUID authAccount(String email, String password) {
        return supabaseAdmin.ensureUser(email, password);
    }
}
