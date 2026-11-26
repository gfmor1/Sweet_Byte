export function isValidDelivery(delivery) {
  return (
    typeof delivery?.deliveryAddress === "string" &&
    delivery.deliveryAddress.trim().length > 0 &&
    Number.isFinite(delivery.latitude) &&
    Number.isFinite(delivery.longitude) &&
    Math.abs(delivery.latitude) <= 90 &&
    Math.abs(delivery.longitude) <= 180
  );
}