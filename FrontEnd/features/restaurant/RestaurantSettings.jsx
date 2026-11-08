"use client";

import { useEffect, useState } from "react";
import { useMapFocus } from "../../components/MapFocusContext";
import { formatEnum } from "../../services/enumApi";
import { explain, ROLES } from "../../services/permissions";
import styles from "./restaurant.module.css";

const ROLE = ROLES.RESTAURANT_OWNER;

// Which permission rule governs moving from the current status to the target
function statusBlockedReason(current, target) {
  if (current === target) return `The restaurant is already ${formatEnum(target).toLowerCase()}.`;
  if (target === "PAUSED") return explain(ROLE, "pauseRestaurant", { restaurantStatus: current });
  if (target === "OPEN" && current === "PAUSED") {
    return explain(ROLE, "reopenRestaurant", { restaurantStatus: current });
  }
  return null;
}

function validCoords(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

function formatCoord(value) {
  const number = Number(value);
  return value === null || value === undefined || !Number.isFinite(number)
    ? "Not set"
    : number.toFixed(5);
}

function RestaurantSettings({
  restaurant,
  restaurantStatuses,
  busy,
  onUpdateStatus,
  onSaveLocation
}) {
  const { setExtras } = useMapFocus();
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");

  // Always release the shared map when leaving this tab / view
  useEffect(() => () => setExtras({ picker: null }), [setExtras]);

  // Keep the map picker in sync with the draft while picking
  useEffect(() => {
    if (!picking) return;
    setExtras({
      picker: {
        kind: "restaurant",
        label: "Click the map to place your restaurant",
        point: draft || undefined,
        onPick: (latitude, longitude) => {
          setError("");
          setDraft({ latitude, longitude });
        }
      }
    });
  }, [picking, draft, setExtras]);

  function startPicking() {
    const lat = Number(restaurant.latitude);
    const lng = Number(restaurant.longitude);
    const hasCurrent =
      restaurant.latitude != null && restaurant.longitude != null && validCoords(lat, lng);
    setDraft(hasCurrent ? { latitude: lat, longitude: lng } : null);
    setError("");
    setPicking(true);
  }

  function stopPicking() {
    setPicking(false);
    setDraft(null);
    setError("");
    setExtras({ picker: null });
  }

  async function save() {
    if (!draft || !validCoords(draft.latitude, draft.longitude)) {
      setError("Click the map to choose a valid location first.");
      return;
    }
    const ok = await onSaveLocation(draft.latitude, draft.longitude);
    if (ok) stopPicking();
  }

  return (
    <section className={styles.section} aria-labelledby="settings-heading">
      <h3 id="settings-heading" className={styles.sectionTitle}>
        Settings
      </h3>

      <div className={`card ${styles.settingsCard}`}>
        <dl className={styles.settingsList}>
          <div>
            <dt>Restaurant name</dt>
            <dd>{restaurant.name}</dd>
          </div>
          <div>
            <dt>Current status</dt>
            <dd>{formatEnum(restaurant.status)}</dd>
          </div>
        </dl>

        <p className={styles.meta} id="status-help">
          Change whether customers can order from you.
        </p>
        <div
          className={styles.segmented}
          role="group"
          aria-label="Change restaurant status"
          aria-describedby="status-help"
        >
          {restaurantStatuses.map((target) => {
            const reason = statusBlockedReason(restaurant.status, target);
            const current = restaurant.status === target;
            return (
              <button
                key={target}
                type="button"
                className={`${styles.segment} ${current ? styles.segmentActive : ""}`}
                onClick={() => onUpdateStatus(target)}
                disabled={Boolean(reason) || busy}
                title={reason || (busy ? "Another action is in progress." : undefined)}
                aria-pressed={current}
              >
                {formatEnum(target)}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`card ${styles.settingsCard}`} aria-labelledby="location-heading" role="group">
        <h4 id="location-heading" className={styles.sectionTitle}>
          Restaurant location
        </h4>
        <dl className={styles.settingsList}>
          <div>
            <dt>Latitude</dt>
            <dd>{formatCoord(restaurant.latitude)}</dd>
          </div>
          <div>
            <dt>Longitude</dt>
            <dd>{formatCoord(restaurant.longitude)}</dd>
          </div>
          {picking && (
            <div>
              <dt>New location</dt>
              <dd>
                {draft
                  ? `${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}`
                  : "Click the map to choose"}
              </dd>
            </div>
          )}
        </dl>

        {!picking ? (
          <div className={styles.actions}>
            <button
              type="button"
              className="btn-secondary"
              onClick={startPicking}
              disabled={busy}
              aria-label="Set restaurant location on the map"
            >
              Set on map
            </button>
          </div>
        ) : (
          <>
            <p className={styles.meta} id="location-help">
              Click the map to place your restaurant, then save.
            </p>
            {error && (
              <p className={styles.fieldError} role="alert">
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className="btn-secondary"
                onClick={save}
                disabled={busy || !draft}
                aria-describedby="location-help"
              >
                Save location
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={stopPicking}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default RestaurantSettings;
