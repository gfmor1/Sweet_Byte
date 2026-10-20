package com.sweetbyte.eats.application.service;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.sweetbyte.eats.application.enums.CourierStatus;
import com.sweetbyte.eats.application.enums.MenuItemStatus;
import com.sweetbyte.eats.application.enums.OrderStatus;
import com.sweetbyte.eats.application.enums.RestaurantStatus;
import com.sweetbyte.eats.application.enums.Role;

@Service
public class EnumServiceImpl implements EnumService {

    // LinkedHashMap keeps the groups in insertion order in the JSON
    @Override
    public Map<String, List<String>> getAll() {
        Map<String, List<String>> enums = new LinkedHashMap<>();
        enums.put("roles", names(Role.values()));
        enums.put("orderStatuses", names(OrderStatus.values()));
        enums.put("restaurantStatuses", names(RestaurantStatus.values()));
        enums.put("menuItemStatuses", names(MenuItemStatus.values()));
        enums.put("courierStatuses", names(CourierStatus.values()));
        return enums;
    }

    private static List<String> names(Enum<?>[] values) {
        return Arrays.stream(values).map(Enum::name).toList();
    }
}
