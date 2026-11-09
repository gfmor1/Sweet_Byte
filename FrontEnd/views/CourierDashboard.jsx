"use client";

import { useEffect } from "react";
import Tabs from "../components/Tabs";
import { useMapFocus } from "../components/MapFocusContext";
import CourierActions from "../features/courier/CourierActions";
import CourierStatus from "../features/courier/CourierStatus";
import OfferCard from "../features/courier/OfferCard";
import OrderHistory from "../features/pricing/OrderHistory";
import styles from "../features/courier/courier.module.css";
import useCourier from "../features/courier/useCourier";

export default function CourierDashboard({ user, onLog }) {
  const { courier, offer, loaded, busy, message, error, runCommand } = useCourier(onLog);
  const { setFocus } = useMapFocus();

  // With an order, the courier's map focuses on 3 points: me, the pickup restaurant and the drop-off.
  const myLat = courier?.latitude;
  const myLng = courier?.longitude;
  const pLat = offer?.restaurantLatitude;
  const pLng = offer?.restaurantLongitude;
  const dLat = offer?.dropoffLatitude;
  const dLng = offer?.dropoffLongitude;
  const pickupName = offer?.restaurantName;
  const pickedUp = offer?.courierStatus === "CARRYING" || offer?.orderStatus === "PICKED_UP";
  const hasOffer = Boolean(offer);

  useEffect(() => {
    if (!hasOffer || myLat === undefined || myLat === null) {
      setFocus(null);
      return;
    }
    setFocus({
      route: {
        mine: { name: "You", latitude: myLat, longitude: myLng },
        pickup: { name: pickupName, latitude: pLat, longitude: pLng },
        dropoff: { name: "Customer", latitude: dLat, longitude: dLng },
        stage: pickedUp ? "toDropoff" : "toPickup",
      },
    });
  }, [setFocus, myLat, myLng, hasOffer, pickupName, pLat, pLng, dLat, dLng, pickedUp]);

  useEffect(() => () => setFocus(null), [setFocus]);

  if (user?.role && user.role !== "COURIER") {
    return <p role="alert">This dashboard is only available to couriers.</p>;
  }

  const tabs = [
    {
      id: "delivery",
      label: "Delivery",
      badge: offer ? "1" : undefined,
      content: (
        <OfferCard offer={offer}>
          <CourierActions courier={courier} offer={offer} busy={busy} onCommand={runCommand} />
        </OfferCard>
      ),
    },
    {
      id: "status",
      label: "Status",
      content: (
        <CourierStatus courier={courier} offer={offer} busy={busy} onCommand={runCommand} />
      ),
    },
    {
      id: "history",
      label: "History",
      // Couriers never see what the customer paid.
      content: <OrderHistory showAmounts={false} onLog={onLog} />,
    },
  ];

  return (
    <div className={`dashboard ${styles.wrap}`}>
      {!loaded && <p role="status">Loading courier status...</p>}
      {message && (
        <p role="status" className={`${styles.message} ${styles.success}`}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className={`${styles.message} ${styles.errorMsg}`}>
          {error}
        </p>
      )}

      <Tabs tabs={tabs} defaultTab="delivery" ariaLabel="Courier sections" />
    </div>
  );
}
