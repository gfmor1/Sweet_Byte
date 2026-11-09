package com.sweetbyte.eats.repository.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.model.Courier;

public interface CourierRepository extends JpaRepository<Courier, Long> {

    List<Courier> findByStatus(CourierStatus status);
}
