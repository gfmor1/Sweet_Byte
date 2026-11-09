
package com.sweetbyte.eats.application.dispatch;
 
import java.util.Collection;
import java.util.Optional;
 
import com.sweetbyte.eats.application.model.Courier;
import com.sweetbyte.eats.application.model.Restaurant;
 
/**
 * Strategy interface: chooses which courier is offered a ready order.
 * The services only depend on this interface; the fixed rule of the
 * assignment lives in NearestIdleCourierRule.
 */
public interface DispatchRule {
 
    // Returns the chosen courier among the candidates, or empty if none can take it.
    Optional<Courier> select(Restaurant restaurant, Collection<Courier> candidates);
}
 
