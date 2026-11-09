package com.sweetbyte.eats.application.model;

import java.util.List;

// Everything the operator dashboard lists.
public record OperatorOverview(List<Restaurant> restaurants, List<Order> orders) {
}
