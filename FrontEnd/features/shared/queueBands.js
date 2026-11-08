// R-DASH-03 queue colour bands. Adjust the thresholds here only.
export const QUEUE_BANDS = { greenMax: 2, amberMax: 5 };

export const BAND_LABELS = {
  green: "Light",
  amber: "Busy",
  red: "Heavy",
};

// 0-2 green, 3-5 amber, 6+ red
export function getQueueBand(size) {
  const count = Number(size) || 0;
  if (count <= QUEUE_BANDS.greenMax) return "green";
  if (count <= QUEUE_BANDS.amberMax) return "amber";
  return "red";
}
