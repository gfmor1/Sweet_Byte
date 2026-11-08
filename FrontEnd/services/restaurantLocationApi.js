import { apiRequest } from "./apiClient";
import { setRestaurantOverride } from "./locationOverrides";

// Backend contract (to be built): PATCH /api/restaurants/{id}/location
//   body { latitude, longitude } -> RestaurantResponse. Owner of that restaurant only.
// Until that endpoint exists (404/405/501) the location is saved in this browser only, so the
// demo still works. Returns { saved: "server" | "local" }.
export async function updateRestaurantLocation(restaurantId, latitude, longitude) {
  try {
    await apiRequest(`/api/restaurants/${encodeURIComponent(restaurantId)}/location`, {
      method: "PATCH",
      body: { latitude, longitude },
    });
    return { saved: "server" };
  } catch (error) {
    if ([404, 405, 501].includes(error.status)) {
      setRestaurantOverride(restaurantId, latitude, longitude);
      return { saved: "local" };
    }
    throw error;
  }
}
