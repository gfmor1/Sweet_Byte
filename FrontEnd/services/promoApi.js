import { apiRequest } from "./apiClient";

// Checks a promo code against the cart subtotal (POST /api/promo/validate).
// Resolves { code, discount }; rejects with an Error whose message is the server's refusal text
// (unknown, expired or below the minimum order, each with its own text).
export async function validatePromo(code, subtotal) {
  if (!code?.trim()) throw new Error("Enter a promo code.");
  return apiRequest("/api/promo/validate", {
    method: "POST",
    body: { code: code.trim(), subtotal },
  });
}
