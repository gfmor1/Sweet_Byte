"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatEnum } from "../../services/enumApi";
import QueueBadge from "../shared/QueueBadge";
import styles from "./customer.module.css";

const STATUS_CLASS = {
  OPEN: styles.open,
  PAUSED: styles.paused,
  CLOSED: styles.closed,
};

const STATUS_RANK = { OPEN: 0, PAUSED: 1, CLOSED: 2 };

export function sortRestaurants(list) {
  return [...list].sort((a, b) => {
    const rank =
      (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3);
    if (rank !== 0) return rank;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      sensitivity: "base",
    });
  });
}

function RestaurantList({
  restaurants,
  onSelect,
  loading = false,
  headerExtra = null,
  onVisibleIdsChange,
}) {
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(true);

  const openCount = restaurants.filter((r) => r.status === "OPEN").length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return sortRestaurants(restaurants).filter(
      (r) =>
        (!openOnly || r.status === "OPEN") &&
        (!needle || String(r.name || "").toLowerCase().includes(needle))
    );
  }, [restaurants, query, openOnly]);

  // Mirror the list on the map. Only once restaurants have loaded.
  const idsKey = restaurants.length === 0 ? null : JSON.stringify(visible.map((r) => r.id));
  const report = useRef(onVisibleIdsChange);
  useEffect(() => {
    report.current = onVisibleIdsChange;
  }, [onVisibleIdsChange]);

  useEffect(() => {
    report.current?.(idsKey === null ? null : JSON.parse(idsKey));
  }, [idsKey]);

  useEffect(() => () => report.current?.(null), []);

  const activeList = visible.filter((r) => r.status === "OPEN");
  const otherList = visible.filter((r) => r.status !== "OPEN");

  // The queue only matters for restaurants that are taking orders, so paused/closed ones show no queue.
  function renderCard(restaurant) {
    return (
      <li
        key={restaurant.id}
        className={`card ${styles.card} ${restaurant.status === "OPEN" ? "" : styles.cardMuted}`}
      >
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>{restaurant.name}</h3>

          <p className={`${styles.meta} ${styles.cardStatus}`}>
            <span className={`${styles.badge} ${STATUS_CLASS[restaurant.status] || ""}`}>
              {formatEnum(restaurant.status)}
            </span>
          </p>
        </div>

        {restaurant.status === "OPEN" &&
          restaurant.queueSize !== undefined &&
          restaurant.queueSize !== null && (
            <p className={styles.meta}>
              <QueueBadge size={restaurant.queueSize} status={restaurant.status} />
            </p>
          )}

        <div className={styles.cardActions}>
          <button
            className="btn-secondary"
            onClick={() => onSelect(restaurant)}
            aria-label={`View menu of ${restaurant.name}`}
          >
            View Menu
          </button>
        </div>
      </li>
    );
  }

  function renderGroup(title, list, emptyText) {
    return (
      <>
        <div className={styles.groupHead}>
          <h3>{title}</h3>
          <span className={styles.groupCount}>{list.length}</span>
        </div>
        {list.length === 0 ? (
          <p className={styles.hint}>{emptyText}</p>
        ) : (
          <ul className={styles.grid}>{list.map(renderCard)}</ul>
        )}
      </>
    );
  }

  return (
    <section className={styles.section} aria-labelledby="restaurants-heading">
      <div className={styles.headRow}>
        <h2 id="restaurants-heading" className={styles.sectionHead}>
          Restaurants
        </h2>
        {headerExtra}
      </div>

      {restaurants.length === 0 ? (
        !loading && <p>No restaurants available right now.</p>
      ) : (
        <>
          <div className={styles.filters}>
            <input
              type="search"
              className={styles.search}
              placeholder="Search restaurants"
              aria-label="Search restaurants by name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <button
              type="button"
              className={`chip ${openOnly ? "chip-active" : ""}`}
              aria-pressed={openOnly}
              onClick={() => setOpenOnly((value) => !value)}
            >
              Open only
            </button>
          </div>

          {openCount === 0 && (
            <p className={styles.hint} role="status">
              No restaurants are open at the moment. Turn off &quot;Open
              only&quot; to browse menus; ordering is unavailable until one
              reopens.
            </p>
          )}

          {visible.length === 0 ? (
            <p role="status">
              No restaurants match your filters.{" "}
              {openOnly && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setOpenOnly(false)}
                >
                  Show closed and paused too
                </button>
              )}
            </p>
          ) : (
            <>
              {renderGroup("Active restaurants", activeList, "No active restaurants match your search.")}
              {!openOnly &&
                renderGroup("Other (paused or closed)", otherList, "No paused or closed restaurants match your search.")}
            </>
          )}
        </>
      )}
    </section>
  );
}

export default RestaurantList;
