# Promo code: frontend ↔ backend connection

Status: **connected**. The frontend calls the real backend; the promo mock is deleted.

## Contract
- `POST /api/promo/validate` `{ code, subtotal }` → `200 { code, discount }` (code normalised to upper case).
  Refusals → **422** `{ status, error, message }` (unknown / expired / below minimum, each its own text).
  Blank code → 400 "Enter a promo code."
- `POST /api/orders` accepts `promoCode`; re-validated at placement (R-PROMO-01). Refusal → 422, nothing charged.
- Fare (`GET /api/orders/{id}/fare`, `summary.fare`) now carries `discount` and `promoCode`.
  `total = subtotal - discount + delivery + service + smallOrderSurcharge`; discount is capped at the amount
  owed so `total >= 0`; the surcharge uses the pre-discount subtotal. `FarePreview` uses the same rules (`calculateFare`).
- Ledger (`GET /api/ledger`): each entry has `promoCode`, `discount` (null if none). Refund entries copy them from
  their charge. Only DELIVERED orders carry them (rejected/cancelled orders are charged 0).

## Where
Backend: `Fare`, `FareDraft`, `PromoDiscountDecorator`, `PricingService(Impl)`, `OrderServiceImpl`, `LedgerEntry`,
`LedgerServiceImpl`, `FareResponse`, `LedgerEntryResponse`, `PromoController`, `GlobalExceptionHandler`.
Frontend: `services/promoApi.js`, `orderApi.js`, `pricingApi.js`, `config.js`.

## Notes / open
- New columns (`fare.promo_code`, ledger `promo_code`, `discount`) are nullable; `ddl-auto=update` adds them.
  `Fare.discount` is NOT NULL, so a DB with old billing rows needs a reset or a default.
- A refusal at placement still shows at dashboard level (`CustomerDashboard.handlePlaceOrder`), not at the field.
  Apply and the cart-change re-check already surface refusals inline.
- The operator ledger Code/Discount columns still read mock data for mock operator sessions only.
- `calculateFare` is still a client preview; the real total is the server's.
- `promo.codes` has no default in `PromoConfiguration`; a missing property fails startup.
- Mock demo codes now live in `application.properties`: `WELCOME5` (5.00, min 25), `EXPIRED10` (expired), `SIXTYMAX` (8.00, min 60).

## Not verified
Backend unit tests pass (21/22; `contextLoads` needs a database). No end-to-end run against a live DB.
