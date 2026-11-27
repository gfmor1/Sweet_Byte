import { validateMockPromo } from "./mocks/mockPromos";

// Checks a promo code against the cart subtotal. Resolves { code, discount }; rejects with an
// Error whose message is the refusal text shown to the customer (each refusal has its own text).
//
// TODO(promo-backend): UI-only for now, always uses the mock rules. Once the backend defines its
// contract, call it here (see docs/promo-frontend-todo.md), e.g.
//   return apiRequest("/api/promo/validate", { method: "POST", body: { code, subtotal } });
// and delete services/mocks/mockPromos.js.
export async function validatePromo(code, subtotal) {
  return validateMockPromo(code, subtotal);
}
