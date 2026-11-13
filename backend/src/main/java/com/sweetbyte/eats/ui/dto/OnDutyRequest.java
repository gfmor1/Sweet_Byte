package com.sweetbyte.eats.ui.dto;

// Body of POST /api/couriers/me/on-duty : { "latitude": 45.50, "longitude": -73.57 }
// Required: a courier gives their current position when joining the dispatch pool.
// Boxed so a missing field is rejected instead of silently becoming 0.
public record OnDutyRequest(Double latitude, Double longitude) { }
