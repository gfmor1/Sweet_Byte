package com.sweetbyte.eats.repository.persistence;

import com.sweetbyte.eats.application.model.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

//a restaurant’s menu, and a lookup of several items by id when an order is placed.
@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByRestaurantId(Long restaurantId);

}
