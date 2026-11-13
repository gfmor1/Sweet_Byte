export function money(amount, currency = "CAD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

export function time(value) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export function cardLabel(payment) {
  const brand = payment.brand ? payment.brand[0] + payment.brand.slice(1).toLowerCase() : "Card";
  return `${brand} •••• ${payment.last4 || "----"}`;
}
