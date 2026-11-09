package com.sweetbyte.eats.ui.dto;

// Body of PATCH /api/couriers/me/location : { "latitude": 45.50, "longitude": -73.57 }
public record LocationRequest(double latitude, double longitude) { }