"use client";

import { useEffect, useRef, useState } from "react";
import { useMapFocus } from "../../components/MapFocusContext";
import DeliveryAddressPicker from "../customer/DeliveryAddressPicker";
import { reverseGeocode } from "../../services/geocodeApi";
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null); // { address, latitude, longitude }
  const [lookingUp, setLookingUp] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [error, setError] = useState("");
  const lastClick = useRef(0);

  // Always release the shared map when leaving this tab / view
  useEffect(() => () => setExtras({ picker: null }), [setExtras]);

  // While editing, a map click also sets the address (looked up from the clicked point)
  useEffect(() => {
    if (!editing) return;
    setExtras({
      picker: {
        kind: "restaurant",
        label: "Click the map to place your restaurant, or search the address",
        point: draft ? { latitude: draft.latitude, longitude: draft.longitude } : undefined,
        onPick: (latitude, longitude) => pickOnMap(latitude, longitude)
      }
    });
    // pickOnMap only uses setters and refs, so it is safe to leave out of the deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, draft, setExtras]);

  async function pickOnMap(latitude, longitude) {
    const click = ++lastClick.current;
    setError("");
    setPickerKey((key) => key + 1); // clear the address search results
    setDraft({ address: null, latitude, longitude });
    setLookingUp(true);
    const address = await reverseGeocode(latitude, longitude);
    if (click !== lastClick.current) return; // a newer click won
    setLookingUp(false);
    setDraft({ address, latitude, longitude });
  }

  function startEditing() {
    setDraft(null);
    setError("");
    setEditing(true);
  }

  function stopEditing() {
    lastClick.current++;
    setEditing(false);
    setDraft(null);
    setLookingUp(false);
    setError("");
    setExtras({ picker: null });
  }

  // The picker geocodes the typed address; it reports null until a result is chosen.
  function pickAddress(result) {
    lastClick.current++; // cancel a pending map-click lookup
    setLookingUp(false);
    setError("");
    setDraft(
      result
        ? { address: result.deliveryAddress, latitude: result.latitude, longitude: result.longitude }
        : null
    );
  }

  async function save() {
    if (!draft || !draft.address || !validCoords(draft.latitude, draft.longitude)) {
      setError("Search your address or click the map first.");
      return;
    }
    const ok = await onSaveLocation(draft);
    if (ok) stopEditing();
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
            <dt>Address</dt>
            <dd>{restaurant.address || "Not set"}</dd>
          </div>
          <div>
            <dt>Coordinates</dt>
            <dd>
              {formatCoord(restaurant.latitude)}, {formatCoord(restaurant.longitude)}
            </dd>
          </div>
        </dl>

        {!editing ? (
          <div className={styles.actions}>
            <button
              type="button"
              className="btn-secondary"
              onClick={startEditing}
              disabled={busy}
            >
              {restaurant.address ? "Change address" : "Set address"}
            </button>
          </div>
        ) : (
          <>
            <p className={styles.meta}>
              Search your address below, or click your restaurant&apos;s spot on the map.
            </p>
            <DeliveryAddressPicker
              key={pickerKey}
              legend="Restaurant address"
              showUnit={false}
              disabled={busy}
              onChange={pickAddress}
            />
            {draft && (
              <p className={styles.meta}>
                New address: {lookingUp ? "Looking up the address..." : draft.address}
              </p>
            )}
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
                disabled={busy || !draft || lookingUp}
              >
                Save address
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={stopEditing}
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
