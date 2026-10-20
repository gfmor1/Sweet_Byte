import { apiRequest } from "./apiClient";

// Enum lists live in the backend only (GET /api/enums):
// { roles, orderStatuses, restaurantStatuses, menuItemStatuses, courierStatuses }
// Fetched once per page load; enums only change when the backend is redeployed.
let enumsPromise = null;

export function getEnums() {
  if (!enumsPromise) {
    enumsPromise = apiRequest("/api/enums").catch((error) => {
      enumsPromise = null; // don't cache a failure, retry next call
      throw error;
    });
  }
  return enumsPromise;
}

// "RESTAURANT_OWNER" -> "Restaurant Owner"
export function formatEnum(value) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
