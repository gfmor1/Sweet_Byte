package com.sweetbyte.eats.repository.persistence;

import com.sweetbyte.eats.application.model.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long>{

    
}
