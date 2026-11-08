"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so it must never render on the server.
export const CityMapLazy = dynamic(() => import("./CityMap"), {
  ssr: false,
  loading: () => (
    <div className="city-map city-map-empty" role="status">
      Loading map...
    </div>
  ),
});

export default CityMapLazy;
