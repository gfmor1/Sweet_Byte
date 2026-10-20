package com.sweetbyte.eats.repository.persistence;

import com.sweetbyte.eats.application.enums.MenuItemStatus;
import com.sweetbyte.eats.application.model.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

//a restaurant’s menu, and a lookup of several items by id when an order is placed.
@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByRestaurantRestaurantId(Long restaurantID);

    List<MenuItem> findByRestaurantRestaurantIdAndStatus(Long restaurantID, MenuItemStatus status);

    // seeder duplicate check: is this item (by name) already on this restaurant's menu?
    boolean existsByRestaurantRestaurantIdAndName(Long restaurantID, String name);

}
