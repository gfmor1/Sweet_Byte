# Promo code: frontend ↔ backend connection TODO

The promo-code **frontend is built UI-only against mocks**. This file lists what the backend must
provide and where the frontend must be switched over. Every switch point in the code is marked
`TODO(promo-backend)` (`grep -rn "TODO(promo-backend)" FrontEnd`).

Backend state today: only the service slice on `origin/backend/promo` exists (`PromoCode`,
`PromoConfig`, `PromoService.validate`, `PromoRefusedException`, `promo.codes` property). No endpoint,
no request field, no discount in the fare, no ledger fields.

## 1. What the frontend does (so the contract can match)
- Checkout: promo field + **Apply**. After a code is accepted the field is disabled and a **Remove**
  button shows (max **one code per order**).
- Price breakdown: subtotal, promo code, discount (shown negative), delivery fee, service fee,
  small-order surcharge, final total.
- Refusal: the message is shown inline under the field. **Each refusal has its own text** and the
  frontend displays the server message as-is.
- Customer order history: Code + Discount columns. Operator ledger: Code + Discount columns.
  Restaurant and courier tables are unchanged.

## 2. Backend work needed
1. **Request**: add `promoCode` (optional string) to `PlaceOrderRequest` and `PlaceOrderCommand`
   (`POST /api/orders`). Frontend already sends `promoCode` in the body when a code is applied
   (`FrontEnd/services/orderApi.js`). Validate in `OrderServiceImpl.placeOrder` (R-PROMO-01).
2. **Validate/preview endpoint** (recommended so Apply gives instant feedback), suggested:
   `POST /api/promo/validate` body `{ "code": "WELCOME5", "subtotal": 30.00 }`
   → `200 { "code": "WELCOME5", "discount": 5.00 }`, or a 4xx refusal (below).
   If the backend owner prefers placement-only validation, the frontend Apply can become a local
   preview and refusals would appear only after Place Order (shown at dashboard level).
3. **Fare**: add `discount` (and `promoCode`) to `Fare` / `FareDraft` / `FareResponse`.
   Frontend formula assumed: `total = subtotal - discount + deliveryFee + serviceFee + smallOrderSurcharge`,
   discount capped so `total >= 0`, small-order surcharge computed on the **pre-discount** subtotal.
   **Confirm both rules**; the client preview in `FrontEnd/services/config.js` (`calculateFare`) must give
   the same total as the server. Ideally the preview total should come from the server.
4. **Order history / summary**: add `promoCode` + `discount` to `OrderSummaryResponse`
   (`GET /api/orders/{id}/summary`) and to the fare (`GET /api/orders/{id}/fare`).
5. **Ledger**: add `promoCode` + `discount` to `LedgerEntryResponse` / `LedgerEntry`
   (`GET /api/ledger`, used by the customer history and the operator ledger). Refund entries should
   carry the same code/discount (or null) consistently.
6. **Refusal errors**: `PromoRefusedException` extends `RuntimeException`, so it currently falls to a
   **500**. Map it in `GlobalExceptionHandler` to a 4xx (400/409/422, backend owner's call) with the
   usual `{status, error, message}` body. The frontend only needs `message`. Three distinct messages
   (mirroring the branch): unknown, expired, below minimum order. Messages the frontend mock uses:
   - `Promo code X does not exist.`
   - `Promo code X expired on YYYY-MM-DD.`
   - `Promo code X requires a minimum order of $25.00; your order is $10.00.`
   - (client-side only) empty code → `Enter a promo code.`
7. `promo.codes` has no default in `PromoConfiguration`; a missing property fails startup.
   `EXPIRED10` is already expired in the sample config (fine as a refusal test).

## 3. Frontend switch points (what to change once the backend exists)
| File | Marker / change |
|---|---|
| `FrontEnd/services/promoApi.js` | `validatePromo` calls the mock. Replace with the real call (`apiRequest`). |
| `FrontEnd/services/mocks/mockPromos.js` | Mock rules/codes. **Delete** after switching. |
| `FrontEnd/services/config.js` | `calculateFare(subtotal, config, discount)` client preview; align with server total or fetch it. |
| `FrontEnd/services/orderApi.js` | `placeOrder(..., promoCode)` sends `promoCode`; confirm field name. |
| `FrontEnd/services/pricingApi.js` | `toLedgerEntry` / `getOrderSummary` map `promoCode`, `discount`; confirm field names. |
| `FrontEnd/views/CustomerDashboard.jsx` | A refusal at placement (`handlePlaceOrder`) shows as the dashboard-level error, not at the promo field. Decide if it should surface at the field. |
| `FrontEnd/services/mocks/mockStore.js`, `mockData.js` | Mock ledger/fare carry `promoCode`/`discount` (operator mock demo). |

## 4. Mock-mode caveats (current behaviour)
- Customer orders always hit the real `POST /api/orders` (only courier/operator sessions use mock
  data). Until the backend accepts `promoCode`, a placed order's ledger entry will show no code or
  discount, and the real backend charges the **undiscounted** total.
- The operator ledger columns show data only in mock mode (`NEXT_PUBLIC_USE_MOCKS=true`, operator session).

## 5. Test pointers
Mock codes: `WELCOME5` (5.00 off, min 25, exp 2026-12-31), `EXPIRED10` (expired), `SIXTYMAX`
(8.00 off, min 60). Cases: valid, unknown, expired, below minimum, remove, second code blocked while
one is applied, discount larger than subtotal.
