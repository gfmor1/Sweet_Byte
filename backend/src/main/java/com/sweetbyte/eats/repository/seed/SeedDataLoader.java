package com.sweetbyte.eats.repository.seed;

import java.io.IOException;
import java.io.InputStream;

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

    public SeedDataLoader(ObjectMapper objectMapper, UserRepository userRepository,
                          RestaurantRepository restaurantRepository, MenuItemRepository menuItemRepository) {
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

        int created = 0;
        for (SeedData.RestaurantSeed r : seed.restaurants()) created += seedRestaurant(r);

        for (SeedData.CustomerSeed c : seed.customers()) {
            if (userRepository.existsByEmail(c.email())) continue;
            userRepository.save(new Customer(c.supabaseUid(), c.name(), c.email(),
                    c.deliveryAddress(), c.latitude(), c.longitude()));
            created++;
        }

        for (SeedData.CourierSeed c : seed.couriers()) {
            if (userRepository.existsByEmail(c.email())) continue;
            userRepository.save(new Courier(c.supabaseUid(), c.name(), c.email(), c.latitude(), c.longitude()));
            created++;
        }

        for (SeedData.OperatorSeed o : seed.operators()) {
            if (userRepository.existsByEmail(o.email())) continue;
            userRepository.save(new Operator(o.supabaseUid(), o.name(), o.email()));
            created++;
        }

        log.info("Seed data loaded from {}: {} new records", SEED_FILE, created);
    }

    private int seedRestaurant(SeedData.RestaurantSeed r) {
        int created = 0;

        Restaurant restaurant = restaurantRepository.findByName(r.name()).orElse(null);
        boolean isNew = restaurant == null;
        if (isNew) {
            restaurant = new Restaurant(r.name(), r.latitude(), r.longitude());
            restaurant.changeStatus(r.status());
            restaurant = restaurantRepository.save(restaurant);
            created++;
        }

        // An existing restaurant may already have an owner (one owner per restaurant),
        // so owners are only created alongside a restaurant this run created.
        if (r.owner() != null && !userRepository.existsByEmail(r.owner().email())) {
            if (isNew) {
                userRepository.save(new RestaurantOwner(r.owner().supabaseUid(), r.owner().name(),
                        r.owner().email(), restaurant));
                created++;
            } else {
                log.warn("Skipping owner {}: restaurant {} already existed", r.owner().email(), r.name());
            }
        }

        for (SeedData.MenuItemSeed item : r.menu()) {
            if (menuItemRepository.existsByRestaurantRestaurantIdAndName(restaurant.getRestaurantId(), item.name()))
                continue;
            menuItemRepository.save(new MenuItem(restaurant, item.name(), item.price(), item.status()));
            created++;
        }

        return created;
    }
}
