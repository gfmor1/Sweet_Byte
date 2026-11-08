"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapFocusProvider, useMapFocus } from "./MapFocusContext";
import CustomerDashboard from "../views/CustomerDashboard";
import RestaurantDashboard from "../views/RestaurantDashboard";
import OperatorDashboard from "../views/OperatorDashboard";
import CourierDashboard from "../views/CourierDashboard";
import CityMapLazy from "../features/map/CityMapLazy";
import OutputConsole from "./OutputConsole";
import { useConsole } from "./ConsoleContext";
import { getCouriers, getMapRestaurants } from "../services/dispatchApi";
import { getRestaurants } from "../services/restaurantApi";
import { applyRestaurantOverrides } from "../services/locationOverrides";
import { formatEnum } from "../services/enumApi";

const MAP_REFRESH_MS = 5000;

function renderDashboard(user, onLog) {
  switch (user.role) {
    case "CUSTOMER":
      return <CustomerDashboard user={user} onLog={onLog} />;
    case "RESTAURANT_OWNER":
      return <RestaurantDashboard restaurantId={user.restaurantId} user={user} onLog={onLog} />;
    case "COURIER":
      return <CourierDashboard user={user} onLog={onLog} />;
    case "OPERATOR":
      return <OperatorDashboard user={user} onLog={onLog} />;
    default:
      return <p>Dashboard not implemented yet.</p>;
  }
}

function AppShellContent({ user, onLogout }) {
  const { log } = useConsole();
  const [restaurants, setRestaurants] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const lastMapError = useRef("");
  const refreshRef = useRef(() => {});

  const refreshMap = useCallback(async () => {
    // Customers and owners work on the real backend's restaurants even in mock mode (the mock
    // store has its own ids, so pins would never match); only courier/operator use the mock map.
    const usesRealRestaurants = user.role === "CUSTOMER" || user.role === "RESTAURANT_OWNER";
    const [restaurantResult, courierResult] = await Promise.allSettled([
      usesRealRestaurants ? getRestaurants() : getMapRestaurants(),
      getCouriers(),
    ]);

    // Log each failure once, not on every poll.
    const failures = [
      ["Load map restaurants", restaurantResult],
      ["Load map couriers", courierResult],
    ].filter(([, result]) => result.status === "rejected");
    const errorKey = failures.map(([command, r]) => `${command}:${r.reason?.message}`).join("|");
    if (errorKey !== lastMapError.current) {
      lastMapError.current = errorKey;
      failures.forEach(([command, r]) => log({ command, error: r.reason?.message || "Request failed" }));
    }

    const restaurantList = restaurantResult.status === "fulfilled" ? restaurantResult.value : [];
    setRestaurants(applyRestaurantOverrides(restaurantList));
    setCouriers(courierResult.status === "fulfilled" ? courierResult.value : []);
  }, [user, log]);

  useEffect(() => {
    refreshRef.current = refreshMap;
    refreshMap();
    const timer = setInterval(refreshMap, MAP_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refreshMap]);

  // Any successful command may have moved a courier or changed a status: refresh the map.
  const handleLog = useCallback(
    (entry) => {
      log(entry);
      if (entry?.result !== undefined && !entry.error) refreshRef.current();
    },
    [log]
  );

  const { focus, extras } = useMapFocus();
  const [wholeCity, setWholeCity] = useState(false);
  // focus.restaurantIds (one or several) or the older single focus.restaurantId.
  const focusIds = focus?.restaurantIds
    ? focus.restaurantIds
    : focus?.restaurantId !== undefined && focus?.restaurantId !== null
    ? [focus.restaurantId]
    : null;
  const filteredIds = extras.visibleRestaurantIds;
  // R-DASH-02: the map shows the whole city unless a dashboard narrowed it; the user can override that.
  const narrowed =
    focusIds !== null ||
    Boolean(focus?.route) ||
    (Boolean(filteredIds) && filteredIds.length < restaurants.length);

  useEffect(() => {
    if (!narrowed) setWholeCity(false);
  }, [narrowed]);

  const focused = focusIds !== null && !wholeCity;
  const focusKey = focusIds ? focusIds.map(String).join(",") : "";
  const visibleIds = wholeCity ? null : filteredIds;

  const mapRestaurants = useMemo(() => {
    if (focused) {
      const wanted = new Set(focusKey ? focusKey.split(",") : []);
      return restaurants.filter((r) => wanted.has(String(r.id)));
    }
    if (visibleIds) {
      const allowed = new Set(visibleIds.map(String));
      return restaurants.filter((r) => allowed.has(String(r.id)));
    }
    return restaurants;
  }, [focused, focusKey, restaurants, visibleIds]);
  const mapCouriers = useMemo(
    () =>
      focused
        ? (focus.couriers || []).map((courier) => ({ ...courier, forceShow: true }))
        : couriers,
    [focused, focus, couriers]
  );

  const route = wholeCity ? null : focus?.route ?? null;
  const viewToggle = narrowed
    ? {
        label: wholeCity ? "Show focused view" : "Show whole city",
        onClick: () => setWholeCity((previous) => !previous),
      }
    : null;

  return (
    <>
      <header className="shell-header">
        <p className="shell-title">SweetByte</p>
        <span className="role-badge">{formatEnum(user.role)}</span>
        {user.name && <span className="shell-user">{user.name}</span>}
        <button type="button" className="btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </header>

      <div className="shell-layout">
        <section className="map-panel" aria-label="City map">
          <CityMapLazy
            restaurants={mapRestaurants}
            couriers={mapCouriers}
            route={route}
            highlightRestaurantId={user.restaurantId}
            viewToggle={viewToggle}
            userPin={extras.userPin}
            picker={extras.picker}
          />
        </section>

        <main className="shell-dashboard">{renderDashboard(user, handleLog)}</main>
      </div>

      <OutputConsole />
    </>
  );
}

export default function AppShell(props) {
  return (
    <MapFocusProvider>
      <AppShellContent {...props} />
    </MapFocusProvider>
  );
}
