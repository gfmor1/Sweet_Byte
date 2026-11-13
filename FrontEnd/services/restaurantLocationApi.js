import { apiRequest } from "./apiClient";
import { clearRestaurantOverride, setRestaurantOverride } from "./locationOverrides";

// PATCH /api/restaurants/{id}/location  body { address, latitude, longitude } -> RestaurantResponse.
// The owner types the address; the frontend geocodes it (Geoapify) and sends both.
// Owner of that restaurant (or an operator) only.
// If an older backend has no such endpoint (404/405/501) the coordinates are saved in this
// browser only, so the demo still works. Returns { saved: "server" | "local" }.
export async function updateRestaurantLocation(restaurantId, { address, latitude, longitude }) {
  try {
    await apiRequest(`/api/restaurants/${encodeURIComponent(restaurantId)}/location`, {
      method: "PATCH",
      body: { address, latitude, longitude },
    });
    clearRestaurantOverride(restaurantId);
    return { saved: "server" };
  } catch (error) {
    if ([404, 405, 501].includes(error.status)) {
      setRestaurantOverride(restaurantId, latitude, longitude);
      return { saved: "local" };
    }
    throw error;
  }
}
