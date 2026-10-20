package com.sweetbyte.eats.application.service;

import java.util.List;
import java.util.Map;

// The catalog of domain enums the frontend can read (roles, statuses).
public interface EnumService {
    // key: enum group ("roles", "orderStatuses", ...) -> constant names in declaration order
    Map<String, List<String>> getAll();
}
