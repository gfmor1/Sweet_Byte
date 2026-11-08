import { BAND_LABELS, getQueueBand } from "./queueBands";

// Colour plus a text label, so the band is never conveyed by colour alone.
export default function QueueBadge({ size }) {
  const count = Number(size) || 0;
  const band = getQueueBand(count);

  return (
    <span className={`queue-badge band-${band}`}>
      {count} in queue ({BAND_LABELS[band]})
    </span>
  );
}
