"use client";

import QueueBadge from "../shared/QueueBadge";
import StatusPill from "./StatusPill";
import RestaurantsPanel from "./RestaurantsPanel";
import ResetPanel from "./ResetPanel";
import { formatEnum } from "../../services/enumApi";
import styles from "./operator.module.css";

const COURIER_STATUSES = ["IDLE", "ASSIGNED", "CARRYING", "OFFLINE"];
const RESTAURANT_STATUSES = ["OPEN", "PAUSED", "CLOSED"];

function count(list, status) {
  return list.filter((x) => x.status === status).length;
}

function Tile({ label, value, alert, children }) {
  return (
    <div className={`${styles.tile} ${alert ? styles.tileAlert : ""}`}>
      <span className={styles.tileLabel}>{label}</span>
      {value !== undefined && <span className={styles.tileValue}>{value}</span>}
      {children}
    </div>
  );
}

function Breakdown({ statuses, list }) {
  return (
    <div className={styles.tileRow}>
      {statuses.map((s) => (
        <span key={s} className={`${styles.pill} ${styles[`s_${s}`] || ""}`}>
          {formatEnum(s)} {count(list, s)}
        </span>
      ))}
    </div>
  );
}

export default function OverviewPanel({
  restaurants,
  orders,
  couriers,
  queue,
  loaded,
  disabled,
  stalledCount,
  onPause,
  onReopen,
  onReset,
}) {
  const orderStatuses = [...new Set(orders.map((o) => o.status))];

  return (
    <div className={styles.root} style={{ gap: 16 }}>
      <div className={styles.tiles}>
        <Tile label="Restaurants" value={restaurants.length}>
          <Breakdown statuses={RESTAURANT_STATUSES} list={restaurants} />
        </Tile>
        <Tile label="Couriers" value={couriers.length}>
          <Breakdown statuses={COURIER_STATUSES} list={couriers} />
        </Tile>
        <Tile label="Dispatch queue" value={queue.length}>
          <div className={styles.tileRow}>
            <QueueBadge size={queue.length} />
          </div>
        </Tile>
        <Tile label="Orders" value={orders.length}>
          <div className={styles.tileRow}>
            {orderStatuses.length === 0 ? (
              <span className={styles.muted}>None yet</span>
            ) : (
              orderStatuses.map((s) => (
                <span key={s} className={`${styles.pill} ${styles[`s_${s}`] || ""}`}>
                  {formatEnum(s)} {count(orders, s)}
                </span>
              ))
            )}
          </div>
        </Tile>
        <Tile label="Stalled orders" value={stalledCount} alert={stalledCount > 0}>
          <span className={styles.muted}>
            {stalledCount > 0 ? "Need reassignment" : "All clear"}
          </span>
        </Tile>
      </div>

      <RestaurantsPanel
        restaurants={restaurants}
        orders={orders}
        loaded={loaded}
        disabled={disabled}
        onPause={onPause}
        onReopen={onReopen}
      />

      <ResetPanel disabled={disabled} onReset={onReset} />
    </div>
  );
}
