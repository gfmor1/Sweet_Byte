package com.sweetbyte.eats.application.service;

import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.application.exceptions.NotFoundException;
import com.sweetbyte.eats.application.model.Restaurant;
import com.sweetbyte.eats.repository.persistence.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public interface RestaurantService {


    
}
