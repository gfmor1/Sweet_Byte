package com.sweetbyte.eats.repository.persistence;
import org.springframework.data.jpa.repository.JpaRepository;

import com.sweetbyte.eats.application.model.User;

//find a user by firebaseUid (used by the security filter on every request) or by email
public interface UserRepository extends JpaRepository<User, Long> {
}
