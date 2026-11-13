"use client";

import { useEffect, useRef, useState } from "react";

export default function DeliveryAddressPicker({
  onChange,
  disabled = false,
  legend = "Delivery address",
  showUnit = true
}) {
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const request = useRef(null);

  useEffect(() => {
    return () => request.current?.abort();
  }, []);

  function updateDelivery(address, apartment) {
    if (!address) {
      onChange(null);
      return;
    }

    onChange({
      ...address,
      deliveryAddress: apartment.trim()
        ? `${address.deliveryAddress}, Unit ${apartment.trim()}`
        : address.deliveryAddress
    });
  }

  function changeQuery(value) {
    request.current?.abort();
    request.current = null;

    setQuery(value);
    setResults([]);
    setSelected(null);
    setLoading(false);
    setMessage("");
    onChange(null);
  }

  async function searchAddress() {
    request.current?.abort();

    const controller = new AbortController();
    request.current = controller;

    setSelected(null);
    setResults([]);
    setMessage("");
    onChange(null);

    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

    if (!apiKey) {
      setMessage("Address search is not configured.");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({
        text: query.trim(),
        apiKey,
        format: "json",
        limit: "5",
        filter: "countrycode:ca",
        bias: "proximity:-73.5673,45.5019"
      });

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?${params}`,
        {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000)
          ])
        }
      );

      if (!response.ok) {
        throw new Error("Address search failed. Please try again.");
      }

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        throw new Error("Invalid address search response.");
      }

      const addresses = data.results
        .filter((result) =>
          result.housenumber &&
          result.street &&
          result.formatted &&
          Number.isFinite(result.lat) &&
          Number.isFinite(result.lon) &&
          Math.abs(result.lat) <= 90 &&
          Math.abs(result.lon) <= 180
        )
        .map((result) => ({
          deliveryAddress: result.formatted,
          latitude: result.lat,
          longitude: result.lon
        }));

      if (controller.signal.aborted) return;

      setResults(addresses);
      setMessage(
        addresses.length
          ? "Select your delivery address."
          : "No full address found. Include the street number and city."
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage(
          error.name === "TimeoutError"
            ? "Address search timed out. Please try again."
            : error.message
        );
      }
    } finally {
      if (request.current === controller) {
        setLoading(false);
      }
    }
  }

  return (
    <fieldset disabled={disabled} style={{ margin: "1rem 0" }}>
      <legend>{legend}</legend>

      <label htmlFor="delivery-search">
        Street number, street name and city
      </label>

      <input
        id="delivery-search"
        value={query}
        maxLength={250}
        placeholder="1455 Boulevard De Maisonneuve Ouest, Montreal"
        autoComplete="street-address"
        onChange={(event) => changeQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();

            if (!loading && query.trim().length >= 5) {
              searchAddress();
            }
          }
        }}
      />

      <button
        type="button"
        onClick={searchAddress}
        disabled={loading || query.trim().length < 5}
      >
        {loading ? "Searching..." : "Find address"}
      </button>

      <p role="status">{message}</p>

      {results.map((address, index) => (
        <label
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: "0.5rem 0"
          }}
        >
          <input
            type="radio"
            name="delivery-address"
            checked={selected === address}
            style={{ width: "auto" }}
            onChange={() => {
              setSelected(address);
              updateDelivery(address, unit);
            }}
          />

          {address.deliveryAddress}
        </label>
      ))}

      {showUnit && (
        <>
          <label htmlFor="delivery-unit">
            Apartment / unit (optional)
          </label>

          <input
            id="delivery-unit"
            value={unit}
            maxLength={50}
            autoComplete="address-line2"
            onChange={(event) => {
              setUnit(event.target.value);
              updateDelivery(selected, event.target.value);
            }}
          />
        </>
      )}

      {selected && showUnit && (
        <p>
          Deliver to: {selected.deliveryAddress}
          {unit.trim() ? `, Unit ${unit.trim()}` : ""}
        </p>
      )}

      <small>
        Address search by{" "}
        <a href="https://www.geoapify.com/">Geoapify</a>.
        Data ©{" "}
        <a href="https://www.openstreetmap.org/copyright">
          OpenStreetMap contributors
        </a>.
      </small>
    </fieldset>
  );
}