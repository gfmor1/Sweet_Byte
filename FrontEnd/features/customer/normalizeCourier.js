// Defensive courier extraction. orderApi.toOrder does not map courier data yet;
// this accepts any of:
//   order.courier = { id, name, status, latitude, longitude }
//   order.courierId / courierName / courierStatus
//   order.courierLatitude / order.courierLongitude
export function normalizeCourier(order) {
  if (!order) return null;

  const nested = order.courier && typeof order.courier === "object" ? order.courier : {};

  const id = nested.id ?? order.courierId ?? null;
  const name = nested.name ?? order.courierName ?? null;
  const status = nested.status ?? order.courierStatus ?? null;

  const lat = Number(nested.latitude ?? order.courierLatitude);
  const lng = Number(nested.longitude ?? order.courierLongitude);
  const hasCoords =
    (nested.latitude ?? order.courierLatitude) != null &&
    (nested.longitude ?? order.courierLongitude) != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  if (id === null && !name && !hasCoords) return null;

  return {
    id: id ?? `order-${order.id}`,
    name: name || "Courier",
    status: status || "ASSIGNED",
    latitude: hasCoords ? lat : null,
    longitude: hasCoords ? lng : null,
    hasCoords,
  };
}

export function courierMarker(order) {
  const courier = normalizeCourier(order);
  if (!courier || !courier.hasCoords) return null;
  const { id, name, status, latitude, longitude } = courier;
  return { id, name, status, latitude, longitude };
}

export function courierText(order) {
  const courier = normalizeCourier(order);
  if (!courier) return null;
  const who = courier.name === "Courier" ? "Courier" : `Courier ${courier.name}`;
  if (order.status === "PICKED_UP" || courier.status === "CARRYING") {
    return `${who} is on the way to you`;
  }
  return `${who} assigned, heading to the restaurant`;
}
