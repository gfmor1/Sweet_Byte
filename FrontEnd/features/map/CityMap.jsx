"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import QueueBadge from "../shared/QueueBadge";
import { formatEnum } from "../../services/enumApi";

const DEFAULT_CENTER = [45.5017, -73.5673]; // Montreal
const FIT_PADDING = [40, 40];
const SINGLE_POINT_ZOOM = 14;
const MAX_FIT_ZOOM = 16;

const RESTAURANT_STATUSES = ["OPEN", "PAUSED", "CLOSED"];
const COURIER_STATUSES = ["IDLE", "ASSIGNED", "CARRYING"];

const hasLocation = (item) =>
  Number.isFinite(Number(item.latitude)) &&
  Number.isFinite(Number(item.longitude)) &&
  item.latitude !== null &&
  item.longitude !== null;

// divIcon + CSS classes (see globals.css) avoids Leaflet's default image path issues in bundlers.
const iconCache = new Map();
function pinIcon(kind, status, highlighted) {
  const key = `${kind}:${status}:${highlighted}`;
  if (!iconCache.has(key)) {
    const classes = `map-pin map-pin-${kind} map-pin-${String(status).toLowerCase()}${
      highlighted ? " map-pin-highlight" : ""
    }`;
    const letter = { restaurant: "R", dropoff: "D", you: "Y" }[kind] || "C";
    const style =
      kind === "dropoff"
        ? ' style="background:#6d28d9;color:#fff"'
        : kind === "you"
        ? ' style="background:#0369a1;color:#fff"'
        : "";
    iconCache.set(
      key,
      L.divIcon({
        className: "map-pin-wrapper",
        html: `<span class="${classes}"${style}>${letter}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -14],
      })
    );
  }
  return iconCache.get(key);
}

// Re-fits only when the set of points actually changes, so polling does not reset the user's pan/zoom.
function FitToPoints({ points }) {
  const map = useMap();
  const signature = points.map(([lat, lng]) => `${lat},${lng}`).join("|");
  const first = useRef(true);

  // The container is sized by CSS and can change with the viewport.
  useEffect(() => {
    const container = map.getContainer();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    const animate = !first.current;
    first.current = false;
    map.invalidateSize();
    if (points.length === 1) {
      map.flyTo(points[0], SINGLE_POINT_ZOOM, { animate, duration: 0.8 });
    } else if (points.length > 1) {
      map.flyToBounds(L.latLngBounds(points), {
        padding: FIT_PADDING,
        maxZoom: MAX_FIT_ZOOM,
        animate,
        duration: 0.8,
      });
    }
  }, [map, signature]); // points is derived from signature

  return null;
}

// Road geometry for a leg, from the public OSRM demo server (display only; the system itself
// does no route planning). Resolves to [[lat, lng], ...] or null, in which case the map keeps
// drawing the straight line.
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const roadCache = new Map();
const pathId = (leg) => leg.path.flat().map((n) => n.toFixed(5)).join(",");

async function fetchRoad(path, signal) {
  const [[fromLat, fromLng], [toLat, toLng]] = path;
  try {
    const response = await fetch(
      `${OSRM_URL}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,
      { signal }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const coordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    return coordinates.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}

// Click-to-place mode: a click reports the position through picker.onPick.
function ClickToPick({ picker }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = picker ? "crosshair" : "";
    return () => {
      container.style.cursor = "";
    };
  }, [map, picker]);
  useMapEvents({
    click(event) {
      if (picker) picker.onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function CityMap({
  restaurants = [],
  couriers = [],
  highlightRestaurantId,
  onSelectRestaurant,
  height, // optional; by default the container height comes from CSS
  // Courier view: { mine, pickup, dropoff, stage: "toPickup" | "toDropoff" }, each point {name, latitude, longitude}.
  // When set, ONLY these (up to 3) points and the legs between them are drawn.
  route = null,
  // Blue "Y" pin for the customer: { name, latitude, longitude }.
  userPin = null,
  // Click-to-place mode: { kind: "you" | "restaurant", label, point?, onPick(lat, lng) }.
  picker = null,
}) {
  const routePoints = useMemo(() => {
    if (!route) return null;
    return {
      mine: route.mine && hasLocation(route.mine) ? route.mine : null,
      pickup: route.pickup && hasLocation(route.pickup) ? route.pickup : null,
      dropoff: route.dropoff && hasLocation(route.dropoff) ? route.dropoff : null,
    };
  }, [route]);
  const latLng = (p) => [Number(p.latitude), Number(p.longitude)];
  const shownRestaurants = useMemo(
    () => (route ? [] : restaurants.filter(hasLocation)),
    [restaurants, route]
  );
  // `forceShow` couriers (map focus) are drawn even when OFFLINE.
  const shownCouriers = useMemo(
    () =>
      route
        ? []
        : couriers.filter(
            (courier) =>
              (courier.forceShow || courier.status !== "OFFLINE") && hasLocation(courier)
          ),
    [couriers, route]
  );
  const sizeStyle = height ? { height } : undefined;

  const points = useMemo(
    () =>
      routePoints
        ? [routePoints.mine, routePoints.pickup, routePoints.dropoff].filter(Boolean).map(latLng)
        : [
            ...shownRestaurants,
            ...shownCouriers,
            ...(userPin && hasLocation(userPin) ? [userPin] : []),
          ].map(latLng),
    [routePoints, shownRestaurants, shownCouriers, userPin]
  );

  // Before pickup: me -> restaurant (solid), restaurant -> client (dashed).
  // After pickup: me -> client (solid), the restaurant pin stays as a reference.
  const legs = useMemo(() => {
    if (!routePoints) return [];
    const { mine, pickup, dropoff } = routePoints;
    const toDropoff = route.stage === "toDropoff";
    const result = [];
    if (toDropoff) {
      if (mine && dropoff) result.push({ key: "me-dropoff", path: [latLng(mine), latLng(dropoff)], dashed: false });
    } else {
      if (mine && pickup) result.push({ key: "me-pickup", path: [latLng(mine), latLng(pickup)], dashed: false });
      if (pickup && dropoff) result.push({ key: "pickup-dropoff", path: [latLng(pickup), latLng(dropoff)], dashed: true });
    }
    return result;
  }, [routePoints, route]);

  // Replace each straight leg by the road geometry once it has loaded.
  const [roadPaths, setRoadPaths] = useState({});
  const legsSignature = legs.map(pathId).join("|");

  useEffect(() => {
    const controller = new AbortController();
    legs.forEach((leg) => {
      const id = pathId(leg);
      if (roadCache.has(id)) {
        setRoadPaths((previous) =>
          previous[id] ? previous : { ...previous, [id]: roadCache.get(id) }
        );
        return;
      }
      fetchRoad(leg.path, controller.signal).then((road) => {
        if (!road) return;
        roadCache.set(id, road);
        if (!controller.signal.aborted) setRoadPaths((previous) => ({ ...previous, [id]: road }));
      });
    });
    return () => controller.abort();
  }, [legsSignature]); // legs is derived from the signature

  // Always render the base map; with nothing to draw, show a message on top of it.
  const isEmpty = points.length === 0;

  return (
    <div className="city-map-wrapper">
      <div className="city-map" style={{ ...sizeStyle, position: "relative" }}>
        {picker && (
          <p
            role="status"
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              margin: 0,
              padding: "6px 12px",
              borderRadius: 8,
              background: "#0369a1",
              color: "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              fontSize: "0.9rem",
            }}
          >
            {picker.label || "Click the map to choose a location"}
          </p>
        )}
        {isEmpty && !picker && (
          <p
            role="status"
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              margin: 0,
              padding: "6px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
              fontSize: "0.9rem",
            }}
          >
            No locations to display on the map.
          </p>
        )}
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToPoints points={points} />
          <ClickToPick picker={picker} />

          {userPin && hasLocation(userPin) && !picker && (
            <Marker position={latLng(userPin)} icon={pinIcon("you", "YOU", true)}>
              <Popup>
                <strong>{userPin.name || "You"}</strong>
                <br />
                Your simulated delivery location
              </Popup>
            </Marker>
          )}
          {picker?.point && hasLocation(picker.point) && (
            <Marker
              position={latLng(picker.point)}
              icon={pinIcon(picker.kind === "restaurant" ? "restaurant" : "you", "DRAFT", true)}
            />
          )}

          {legs.map((leg) => (
            <Polyline
              key={leg.key}
              positions={roadPaths[pathId(leg)] || leg.path}
              pathOptions={{
                color: leg.dashed ? "#6d28d9" : "#1d4ed8",
                weight: 4,
                opacity: 0.85,
                dashArray: leg.dashed ? "8 8" : undefined,
              }}
            />
          ))}

          {routePoints?.mine && (
            <Marker position={latLng(routePoints.mine)} icon={pinIcon("courier", "IDLE", true)}>
              <Popup>
                <strong>You</strong>
              </Popup>
            </Marker>
          )}
          {routePoints?.pickup && (
            <Marker position={latLng(routePoints.pickup)} icon={pinIcon("restaurant", "OPEN", true)}>
              <Popup>
                <strong>Pickup: {routePoints.pickup.name || "Restaurant"}</strong>
              </Popup>
            </Marker>
          )}
          {routePoints?.dropoff && (
            <Marker position={latLng(routePoints.dropoff)} icon={pinIcon("dropoff", "DROPOFF", true)}>
              <Popup>
                <strong>Drop-off: {routePoints.dropoff.name || "Customer"}</strong>
              </Popup>
            </Marker>
          )}

          {shownRestaurants.map((restaurant) => (
            <Marker
              key={`r-${restaurant.id}`}
              position={[Number(restaurant.latitude), Number(restaurant.longitude)]}
              icon={pinIcon(
                "restaurant",
                restaurant.status,
                String(restaurant.id) === String(highlightRestaurantId)
              )}
              eventHandlers={{ click: () => onSelectRestaurant?.(restaurant) }}
            >
              <Popup>
                <strong>{restaurant.name}</strong>
                <br />
                Status: {formatEnum(restaurant.status)}
                {restaurant.queueSize !== undefined && restaurant.queueSize !== null && (
                  <>
                    <br />
                    <QueueBadge size={restaurant.queueSize} />
                  </>
                )}
              </Popup>
            </Marker>
          ))}

          {shownCouriers.map((courier) => (
            <Marker
              key={`c-${courier.id}`}
              position={[Number(courier.latitude), Number(courier.longitude)]}
              icon={pinIcon("courier", courier.status, false)}
            >
              <Popup>
                <strong>{courier.name}</strong>
                <br />
                Courier: {formatEnum(courier.status)}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {route ? (
        <ul className="map-legend" aria-label="Map legend">
          <li>C: you</li>
          <li>R: pickup (restaurant)</li>
          <li>D: drop-off (customer)</li>
          <li>Routes follow roads (public OSRM server); a straight line shows if it is unreachable.</li>
        </ul>
      ) : (
      <ul className="map-legend" aria-label="Map legend">
        {RESTAURANT_STATUSES.map((status) => (
          <li key={status}>
            <span className={`map-legend-swatch map-pin-restaurant map-pin-${status.toLowerCase()}`} />
            Restaurant {formatEnum(status)}
          </li>
        ))}
        {COURIER_STATUSES.map((status) => (
          <li key={status}>
            <span className={`map-legend-swatch map-pin-courier map-pin-${status.toLowerCase()}`} />
            Courier {formatEnum(status)}
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
