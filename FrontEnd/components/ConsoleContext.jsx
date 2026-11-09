"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const MAX_ENTRIES = 200;

// Default value makes useConsole() a harmless no-op outside a provider.
const ConsoleContext = createContext({ entries: [], log: () => {}, clear: () => {} });

let nextEntryId = 1;

export function ConsoleProvider({ children }) {
  const [entries, setEntries] = useState([]);

  // Stable identity so dashboards can safely use it in effect dependencies.
  const log = useCallback(({ command, result, error, ...extra } = {}) => {
    const entry = {
      id: nextEntryId++,
      timestamp: new Date().toISOString(),
      command,
      result,
      error,
      ...extra,
    };
    setEntries((previous) => [...previous, entry].slice(-MAX_ENTRIES));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const value = useMemo(() => ({ entries, log, clear }), [entries, log, clear]);

  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function useConsole() {
  return useContext(ConsoleContext);
}
