package com.sweetbyte.eats.repository.persistence;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.sweetbyte.eats.application.model.User;

//find a user by id or by email
public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByEmail(String email);

    Optional<User> findBySupabaseUid(UUID supabaseUid);

    @Query("select count(o) > 0 from RestaurantOwner o where o.restaurant.restaurantId = :restaurantId")
    boolean existsOwnerForRestaurant(@Param("restaurantId") Long restaurantId);

}
