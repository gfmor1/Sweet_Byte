# SweetByte Phase 3 – Demo Prep

- ~15 min total: 6 min live, 9 min questions
- Live run starts from **Reset**: Happy Path + No Courier Available (maybe Sold Out/Paused or Dinner Rush)
- Everyone must be able to answer everything
- Demo the code at tag `phase3` only; nothing newer
- Answers checked against the code at `phase3` (`backend/src/main/java/com/sweetbyte/eats/`). Verify once yourself before the demo.

---

## 0. Numbers to memorize (`backend/src/main/resources/application.properties`)

| Key | Value |
|---|---|
| `pricing.delivery-fee` | **2.99** |
| `pricing.service-fee` | **1.50** |
| `pricing.small-order-threshold` | **15.00** |
| `pricing.small-order-surcharge` | **1.50** |

- **Formula:** `total = Σ(unit price × qty) + 2.99 + 1.50 + (subtotal < 15.00 ? 1.50 : 0)`
- Surcharge only if subtotal is **strictly below** 15.00 (`compareTo(threshold) < 0`)
- Surcharge checks the **item subtotal only**, not subtotal + fees

**Hand-check examples**
- Subtotal 12.00 → 12.00 + 2.99 + 1.50 + 1.50 = **17.99**
- Subtotal 15.00 → no surcharge → 15.00 + 2.99 + 1.50 = **19.49**
- Subtotal 20.00 → 20.00 + 2.99 + 1.50 = **24.49**

---

## 1. Live-demo questions

### Q1. Sponsor picks a delivered order and computes the total by hand. Does it match?
- Use the formula and numbers in section 0
- Read the itemized breakdown on the order summary: subtotal, delivery fee, service fee, surcharge, total
- Values come from `application.properties` via `PricingConfiguration`, not hard-coded
- Fare is stored in the billing record at placement and never recomputed (R-PRC-01)
- So the delivered total = what the customer saw at checkout

### Q2. Show an order below and above the threshold. Why does the surcharge differ?
- `SmallOrderSurchargeDecorator` reads `draft.subtotal()`
- Strictly below threshold → adds surcharge
- Otherwise → adds `BigDecimal.ZERO`
- Live fare preview at checkout shows the difference before paying

### Q3. No courier idle: where does the order wait? Show it get assigned later.
- Restaurant marks order READY → `DispatchServiceImpl.onOrderReady` → `tryOffer`
- No candidate found → event recorded: "Queued: no available courier"
- Order stays READY with no courier (R-DLV-04)
- Queue = READY orders with no courier, ordered by `readyAt`, then arrival sequence (FIFO)
- Operator dispatch panel shows the queue
- Courier becomes idle (goes on duty or finishes delivery) → `retryQueue` offers the oldest waiting order
- Nothing is silently dropped

### Q4. Courier going offline while carrying; courier with two orders.
- `Courier.goOffline()` allowed from IDLE or ASSIGNED only
- From CARRYING → throws `InvalidTransitionException` (R-DLV-03)
- One order max:
  - only IDLE couriers are offered orders (`isAvailable()`)
  - lifecycle `OFFLINE → IDLE → ASSIGNED → CARRYING → IDLE` allows no skipped steps
  - couriers with a pending offer are excluded from candidates

### Q5. Stalled order and operator reassign.
- Courier goes offline while ASSIGNED → order stays READY with an OFFLINE courier
- `getStalledOrders` returns it; operator sees it as stalled
- Operator clicks Reassign → `DispatchServiceImpl.reassign` (operator only):
  - unassigns courier (only before pickup, `Order.unassignCourier`)
  - releases previous courier (offline one stays offline)
  - records an event
  - runs `tryOffer` again
- Previous courier is excluded (accepted/declined offers go into `excluded`)
- No idle courier → order goes back to the queue
- Only an operator command can reassign (R-DLV-02)

### Q6. Reset, empty map, role-restricted commands.
- **Reset:**
  - `ResetServiceImpl` restores the seeded state (couriers, restaurants, orders)
  - Operator-only button
- **Empty map:** Leaflet map handles an empty dataset without crashing
- **Roles:**
  - UI shows only commands allowed for the role
  - Backend checks: `requireCourier`, `requireOperator`, `PermissionDeniedException`
  - Customer sees only their own orders

### Q7. Which buttons are disabled (R-DASH-04/05)? Queue colour bands (R-DASH-03)?
- Confirm Pickup: only for an ASSIGNED courier holding the order
- Confirm Delivery: only when picked up / CARRYING
- Place Order: disabled until valid delivery address and items
- Queue bands: `QueueBand` enum drives the restaurant queue-load badges
- **TODO:** fill in thresholds and colours from `QueueBand.java`: `____`
- **TODO:** confirm button rules in the frontend

### Q8. Does the console log every command and every error?
- Yes, the tabbed shell's output console logs every command and error
- Backend domain events also recorded via `EventService`

---

## 2. Design questions

### Q9. Why Decorator for pricing? What did you reject?
- **Requirement:** R-PRC-01 (same fare for same order, from pricing rules + order facts)
- **Why:**
  - Fare = subtotal + independent, stackable fees
  - Each fee is its own class wrapping a `FareCalculator`
  - New promo = new decorator + one line in the chain; no existing class changes (Open/Closed)
- **Rejected:**
  - One big if/else method → grows with every fee, hard to test
  - Inheritance / subclass per combination → class explosion
  - Strategy → picks one algorithm; here fees accumulate in sequence, so wrapping fits better

### Q10. Walk through the decorator chain. Does order matter?
- Chain built in `PricingServiceImpl`:
  ```
  SmallOrderSurchargeDecorator(
    ServiceFeeDecorator(
      DeliveryFeeDecorator(
        SubtotalCalculator,
        deliveryFee),
      serviceFee),
    threshold, surcharge)
  ```
- `SubtotalCalculator` (concrete component) → `FareDraft.ofSubtotal(order.getSubtotal())`
- Each decorator calls `inner.calculate(order)` first, then adds its own amount
- `FareDraft.toFare()` → immutable `Fare`, saved with the billing record
- Order barely matters: addition is commutative, and surcharge reads `draft.subtotal()` which no fee changes
- A discount decorator would need deliberate placement
- Service only depends on the `FareCalculator` interface; fee classes don't know each other

### Q11. How would you add a promo discount?
- Create `PromoDiscountDecorator extends FareCalculatorDecorator`
- It calls `inner.calculate(order)` and subtracts the discount
- Wrap it in the chain in `PricingServiceImpl`
- No change to other decorators, `Order`, or the service API

### Q12. How is the dispatch rule enforced? Why straight-line distance?
- `DispatchRule` interface, implemented by `NearestIdleCourierRule`
- Steps:
  - filter `Courier::isAvailable` (IDLE)
  - `min` by `distanceTo(restaurant lat, lon)` (`Math.hypot`)
  - tie-break: lowest `userId` (R-DLV-02)
- Straight-line because routing, travel time and traffic are out of scope
- Rule sits behind an interface to keep it separate from `DispatchServiceImpl` and swappable

### Q13. Why separate billing record and ledger? Why is a refund a new entry?
- **Billing record:**
  - Fare at placement (PAYMENT row; REFUND row added next to it)
  - `recordFare` is idempotent; fare never changes
- **Ledger entry:**
  - Order's final state, timestamps, total charge (R-PRC-02)
  - Delivered → total charge
  - Cancelled/rejected → CHARGE of 0
- **Refund of a delivered order:**
  - DELIVERED → REFUNDED
  - Separate REFUND ledger entry of −(charge)
  - Original charge preserved for audit (R-PRC-05, R-PRC-04)
- **Rejected alternative:** editing/deleting the original entry loses the audit trail

### Q14. Did the architecture change? Where do DLV, PRC, DASH live?
- **No layer changes** (spec says not to change layers)
- `ui`: controllers, DTOs, security
  - `CourierController`, `DispatchController`, `PricingController`
  - Frontend in `FrontEnd/`: `features/courier`, `features/pricing`, `features/operator`
- `application`: services, models, enums, rules
  - `dispatch/`, `pricing/`, `DispatchServiceImpl`, `PricingServiceImpl`, `Courier`, `Fare`, `LedgerEntry`
- `repository`: persistence and config
  - `CourierRepository`, `PricingConfiguration`
- DLV = dispatch + courier code
- PRC = pricing + billing/ledger/history/refund code
- DASH = the frontend
- **Report gap:** no package diagram and no explicit "no change" sentence; say it orally and show the folders

### Q15. Why an `assigned` state between idle and carrying?
- Accepting and physically picking up are different events
- `assigned` = holds an order, not yet collected
- Going offline is still allowed in `assigned` → order becomes stalled → operator can reassign
- `carrying` forbids going offline (R-DLV-03)

### Q16. Which Phase II patterns did you extend to the new modules?
- **TODO:** fill in from the Phase II report
- Possible candidates: permission checks and event recording (`EventService.record`, role checks) reused by DLV/PRC
- Not verified from code

---

## 3. Use-case and behaviour questions

### Q17. Describe the order lifecycle.
- Main path: `PLACED → ACCEPTED → PREPARING → READY → PICKED_UP → DELIVERED → REFUNDED`
- Terminal branches:
  - `REJECTED` (restaurant)
  - `CANCELLED` (customer while PLACED, or operator)
- Guards:
  - R-ORD-04: accept/reject only from PLACED
  - R-DLV-01..04: READY → offer/assign, pickup, delivery
  - R-PRC-05: refund after delivery, operator only

### Q18. What happens when a courier declines?
- Offer marked DECLINED
- `retryQueue` runs → order offered to the next nearest idle courier who hasn't refused it
- Declining courier stays IDLE and is never offered that order again
- Nobody else idle → order waits in the queue
- **Careful:** report's UC-DLV-03 says the operator reassigns; code does it automatically
- Say: "system re-offers automatically; operator is only needed for a stalled order after acceptance"

### Q19. What happens on confirm delivery?
- Order → DELIVERED with timestamp
- Courier CARRYING → IDLE
- Ledger entry recorded with total charge (no recomputation)
- Order summary becomes available
- `retryQueue` offers the oldest queued order to this or another idle courier

### Q20. Who sees what in order history? (R-PRC-04)
- Customer: own orders
- Restaurant: own restaurant's orders
- Courier: own deliveries, no customer payment details
- Operator: all orders and ledgers
- Refunds shown as separate entries

### Q21. Refund requests.
- Customer submits request with reason and proof
  - Order delivered less than 1.5 hours ago, or lost/undelivered
- Operator accepts or declines
- **Accept:**
  - Customer refunded full fare
  - Order marked REFUNDED
  - Separate ledger/billing entry
  - Restaurant notified
- **Decline:** customer notified
- Extra scope: spec only required the operator refund of a delivered order; the request flow completes the customer side
- Rejected/cancelled orders are auto-refunded because payment is taken at placement (`CreditRefundServiceImpl`)

---

## 4. Process questions

### Q22. How did you use generative AI?
- Tools: Claude and ChatGPT
- Used for: speeding up implementation, debugging runtime errors, merge conflicts, config problems
- Architecture, logic and main decisions were the team's
- All AI-assisted code reviewed and tested before commit
- Be ready to explain any class you didn't write
- For each pattern/package, know the requirement and one rejected alternative ("knowing the why")

### Q23. Who did what?
- **Nadine:** Order activity diagram, PRC-01/02, models/enums, refund flow, address search
- **Rada:** DLV use cases and activity diagram, dispatch rule/offers/services/APIs
- **Idriss:** pricing module, refund backend, design-pattern text and UML
- **Gerom:** package diagram, DLV-01, PRC-05/06/07, Docker, testing
- **Octavian:** sequence diagrams, DLV-05/06, app shell, console, Leaflet map, role UIs, mock backend
- **Gianfranco:** domain model, PRC-03/04, pricing/history UI, operator controls, Geoapify checkout

---

## 5. Report inconsistencies to avoid being caught on

- [ ] **Pricing values missing from the PDF:** state them from section 0, show `application.properties`
- [ ] **Package diagram missing** from the PDF: explain orally, show repo folders
- [ ] **UC IDs:** tables say `UC-DLV-xx`, text/contributions say `UC-DRV-xx`; same use cases
- [ ] **UC-DLV-05:** precondition says "Out for delivery"; real state is `picked_up`
- [ ] **UC-DLV-03:** says operator reassigns after decline; code re-offers automatically (Q18)
- [ ] **Typo:** `SmallOrdeerSurchargeDecorator` in report; class is `SmallOrderSurchargeDecorator`
- [ ] **QueueBand thresholds/colours** (Q7): fill in
- [ ] **Phase II patterns** (Q16): fill in

---

## 6. Pre-demo checklist

- [ ] `git checkout phase3`, build and run (README / Docker)
- [ ] Run Reset; rehearse Happy Path and No Courier Available end to end
- [ ] Rehearse Sold Out/Paused and Dinner Rush (several orders, one courier, queue order)
- [ ] Pick an order, compute total by hand, compare to the UI
- [ ] All six members present and able to answer any question
