// MOCK promo rules. They mirror backend/promo (origin/backend/promo): flat discount, expiry date
// (valid through the expiry day) and a minimum order value. Remove once the backend serves promos.
// See docs/promo-frontend-todo.md.

export const MOCK_PROMOS = {
  WELCOME5: { discount: 5.0, expiresOn: "2026-12-31", minimumOrderValue: 25.0 },
  EXPIRED10: { discount: 10.0, expiresOn: "2026-01-31", minimumOrderValue: 20.0 },
  SIXTYMAX: { discount: 8.0, expiresOn: "2026-12-31", minimumOrderValue: 60.0 },
};

const cad = (value) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value);

const todayIso = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const normalizePromoCode = (code) => String(code ?? "").trim().toUpperCase();

// Returns { code, discount } or throws Error with a refusal message (one distinct text per refusal).
export function validateMockPromo(rawCode, subtotal) {
  const code = normalizePromoCode(rawCode);
  if (!code) throw new Error("Enter a promo code.");

  const promo = MOCK_PROMOS[code];
  if (!promo) throw new Error(`Promo code ${code} does not exist.`);

  if (todayIso() > promo.expiresOn) {
    throw new Error(`Promo code ${code} expired on ${promo.expiresOn}.`);
  }

  if (subtotal < promo.minimumOrderValue) {
    throw new Error(
      `Promo code ${code} requires a minimum order of ${cad(promo.minimumOrderValue)}; your order is ${cad(subtotal)}.`
    );
  }

  // Never discount below zero.
  return { code, discount: Math.min(promo.discount, subtotal) };
}
