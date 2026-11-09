"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

// focus: null | { restaurantId, couriers: [...] } | { route: {...} }   (see AppShell / CityMap)
// extras: shared map decorations a dashboard can switch on:
//   userPin: null | { name, latitude, longitude }              -> blue "Y" pin (the customer)
//   picker:  null | { kind: "you"|"restaurant", label, point?: {latitude, longitude},
//                     onPick(latitude, longitude) }            -> click-to-place mode
//   visibleRestaurantIds: null | array of ids                  -> only these restaurants are drawn
//   onViewMenu: null | function(restaurant)                    -> "View menu" in the details panel
const EMPTY_EXTRAS = { userPin: null, picker: null, visibleRestaurantIds: null, onViewMenu: null };
const NOOP_VALUE = {
  focus: null,
  setFocus: () => {},
  extras: EMPTY_EXTRAS,
  setExtras: () => {},
};
const MapFocusContext = createContext(NOOP_VALUE);

export function MapFocusProvider({ children }) {
  const [focus, setFocusState] = useState(null);
  const [extras, setExtrasState] = useState(EMPTY_EXTRAS);

  const setFocus = useCallback((next) => setFocusState(next ?? null), []);
  // Merges a partial update, e.g. setExtras({ userPin }) or setExtras({ picker: null }).
  const setExtras = useCallback(
    (patch) => setExtrasState((previous) => ({ ...previous, ...patch })),
    []
  );

  const value = useMemo(
    () => ({ focus, setFocus, extras, setExtras }),
    [focus, setFocus, extras, setExtras]
  );
  return <MapFocusContext.Provider value={value}>{children}</MapFocusContext.Provider>;
}

export function useMapFocus() {
  return useContext(MapFocusContext);
}
