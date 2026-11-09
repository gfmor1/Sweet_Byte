// R-DASH-03 queue colour bands. Adjust the thresholds here only.
export const QUEUE_BANDS = { greenMax: 2, amberMax: 5 };

export const BAND_LABELS = {
  green: "Short",
  amber: "Building",
  red: "Long",
};

// 0-2 green, 3-5 amber, 6+ or paused red
export function getQueueBand(size, restaurantStatus) {
  if (restaurantStatus === "PAUSED") return "red";
  const count = Number(size) || 0;
  if (count <= QUEUE_BANDS.greenMax) return "green";
  if (count <= QUEUE_BANDS.amberMax) return "amber";
  return "red";
}
