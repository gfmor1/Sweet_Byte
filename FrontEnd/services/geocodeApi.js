// Reverse geocoding (coordinates -> street address) with Geoapify, same key as the address search.
// Used when a restaurant owner clicks the map instead of typing an address.
// Never throws: falls back to the coordinates as text, since the backend needs some address.
export async function reverseGeocode(latitude, longitude) {
  const fallback = `Pinned location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  if (!apiKey) return fallback;

  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      apiKey,
      format: "json",
      limit: "1",
    });
    const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    return data.results?.[0]?.formatted || fallback;
  } catch {
    return fallback;
  }
}
