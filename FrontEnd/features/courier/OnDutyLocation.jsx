"use client";

import { useState } from "react";

import DeliveryAddressPicker from "../customer/DeliveryAddressPicker";
import styles from "./courier.module.css";

// Step shown before going on duty: the courier must give their current position,
// because dispatch offers each ready order to the nearest idle courier.
export default function OnDutyLocation({ busy, onConfirm, onCancel }) {
  const [location, setLocation] = useState(null); // { latitude, longitude, label }
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [pickerKey, setPickerKey] = useState(0);

  function locateMe() {
    if (!navigator.geolocation) {
      setGpsError("Your browser cannot share its location. Search your address instead.");
      return;
    }
    setLocating(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setPickerKey((key) => key + 1); // clear any address search
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "Your current location (GPS)",
        });
      },
      (err) => {
        setLocating(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Search your address instead."
            : "Could not get your location. Search your address instead."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function pickAddress(address) {
    setLocation(
      address
        ? { latitude: address.latitude, longitude: address.longitude, label: address.deliveryAddress }
        : null
    );
  }

  return (
    <div className={styles.warning} role="dialog" aria-label="Set your location">
      <p>Where are you now? Orders are offered to the nearest courier on duty.</p>

      <button type="button" className="btn-secondary" disabled={busy || locating} onClick={locateMe}>
        {locating ? "Locating..." : "Use my current location"}
      </button>
      {gpsError && <p role="alert">{gpsError}</p>}

      <DeliveryAddressPicker
        key={pickerKey}
        legend="Or search your current address"
        showUnit={false}
        disabled={busy}
        onChange={pickAddress}
      />

      {location && <p>Going on duty at: {location.label}</p>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={busy || !location}
          title={location ? "Go on duty" : "Set your location first"}
          onClick={() => onConfirm({ latitude: location.latitude, longitude: location.longitude })}
        >
          Go on duty here
        </button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
