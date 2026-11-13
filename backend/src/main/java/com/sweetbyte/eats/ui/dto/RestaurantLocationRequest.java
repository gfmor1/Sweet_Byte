package com.sweetbyte.eats.ui.dto;

// Body of PATCH /api/restaurants/{id}/location :
// { "address": "1455 De Maisonneuve Ouest, Montreal", "latitude": 45.497, "longitude": -73.579 }
// The frontend geocodes the typed address (Geoapify) and sends the address with its coordinates.
// Boxed so a missing coordinate is rejected instead of silently becoming 0.
public record RestaurantLocationRequest(String address, Double latitude, Double longitude) { }
