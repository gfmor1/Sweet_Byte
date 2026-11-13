package com.sweetbyte.eats.application.dispatch;

import java.util.Collection;
import java.util.Comparator;
import java.util.Optional;

import org.springframework.stereotype.Component;

import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Restaurant;

/**
 * The fixed dispatch rule: the nearest idle on-duty courier by straight-line
 * distance to the restaurant on the seeded grid; ties go to the lowest courier id.
 */
@Component
public class NearestIdleCourierRule implements DispatchRule {

    @Override
    public Optional<Courier> select(Restaurant restaurant, Collection<Courier> candidates) {
        double lat = restaurant.getLatitude();
        double lon = restaurant.getLongitude();

        return candidates.stream()
                .filter(Courier::isAvailable)
                .min(Comparator
                        .comparingDouble((Courier c) -> c.distanceTo(lat, lon))
                        .thenComparing(Courier::getUserId));
    }
}