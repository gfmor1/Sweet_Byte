Introduction
{Montreal Eats} is an online food ordering and delivery platform that connects diners with local restaurants and a fleet of couriers. Although ordering a meal is simple from the outside, the platform comprises several components which are divided into modules: a customer ordering interface, a restaurant-facing console, a courier assignment service, a billing system, and an operator dashboard.

Naming your system: each team invents its own name for the platform, and its own specialisation, and uses both consistently from Phase I onward. Wherever this document writes {Montreal Eats}, substitute the name your team has chosen.
●	One team may deliver pizza only, another only vegan food, another groceries from a single market chain, another only late-night orders. Choose something that changes the menu, the restaurants, or the rules your system has to enforce, and state it in your Phase I problem statement. 
●	Your specialization may add detail to the requirements below, but it may not remove any of them: every mandatory module still applies.


The {Montreal Eats} system coordinates customers, restaurants, couriers, and platform operators across a city. It exposes UIs to browse menus, place and pay for an order, prepare and hand off food, and follow a delivery to the door; and back-office tools to pause restaurants, reassign stalled orders, and bill customers.

The operator dashboard represents restaurants and couriers on a map along with order counts and actions (pausing a restaurant, reassigning an order, restoring the initial state). The restaurant console lets staff publish a menu, mark items sold out, accept or reject orders, and mark an order ready for pickup. The courier view lets a courier go on duty, accept the order offered to them, and confirm pickup and delivery.

The {Montreal Eats} simulator provides a graphical way to represent restaurants, couriers and orders on a map, and the events between them (placements, handoffs, deliveries), while exercising core software-design topics: modularity, interfaces (contracts), state & invariants, event-driven architecture, permissions and fault handling.


Scope note: {Montreal Eats} simulates the design of the platform, not the traffic of the city. Courier assignment follows one fixed rule, stated in the DLV module below. 
●	Route planning, travel-time prediction, traffic conditions, live map services, and any attempt to optimize assignments are out of scope. These features may (or may not) be marked as bonus points at the discretion of the Lab demonstrators. 

Acronyms and Definitions
●	Restaurant: A vendor with a published menu, which prepares accepted orders in the order they arrive.
○	States: open | paused | closed
●	Menu Item: A single purchasable dish, with a price.
○	States: available | sold_out
●	Order: A customer’s request to one restaurant, composed of order lines.
○	States: placed | accepted | preparing | ready | picked_up | delivered | refunded, with rejected and cancelled as terminal branches. An order reaches refunded only from delivered, by operator command (R-PRC-05).
●	Order Line: One menu item and a quantity within an order.
●	Preparation Queue: The accepted orders of one restaurant, prepared in arrival order. The queue sets the sequence of preparation; it never refuses an order.
●	Courier: A delivery person on the platform.
○	States: offline | idle | assigned | carrying
●	Assignment: The binding of a ready order to exactly one courier, made by the dispatch rule (R-DLV-02).
●	Handoff: The transfer of an order from restaurant to courier (pickup), and from courier to customer (delivery).
●	REG: Registration, Login & Profiles.
●	ORD: Order & Restaurant Core — the authoritative core service.
●	DLV: Courier & Delivery service.
●	DASH: Simulator dashboard (UI).
●	PRC: Pricing, Billing & Order History.
Details of the system
Users and Profiles
Every user of {Montreal Eats} is authenticated. There is no guest or anonymous access: browsing a menu already requires a session (R-REG-02).
●	Customer: Register and log in; browse menus; place and pay for an order; cancel an order while it is still placed; follow its progress; view their own order history and charges. Cannot see other customers’ orders.
●	Restaurant Owner/Staff: Log in with a restaurant profile; publish and edit the menu; mark items sold out; accept or reject incoming orders; mark an order ready for pickup; pause the restaurant. Cannot see other restaurants’ orders, and cannot assign couriers.
●	Courier: Log in; go on and off duty; accept the order offered to them; confirm pickup and delivery. Cannot choose which order to take, and cannot see a customer’s payment details.
●	Platform Operator: Pause or reopen any restaurant; reassign an order whose courier went offline; view all orders and billing ledgers; refund a delivered order; restore the initial system state. Cannot place orders or be billed (operator accounts are administrative only).
System Overview
Mandatory modules
●	REG – Registration, Login & Profiles (accounts, roles, session gate).
●	ORD – Order & Restaurant Core (menus, order lifecycle, invariants, permissions).
●	DLV – Courier & Delivery (courier state, assignment, handoffs).
●	DASH – Simulator UI (map + tabs per module; event console; controls).
●	PRC – Pricing, Billing & Order History (fares, charges, and a role-scoped ledger of past orders).
Optional modules
●	NTF – Notifications (inline messages in DASH).
●	RVW – Ratings & Reviews (restaurant and courier, after delivery).
●	PROMO – Promotions (promo codes applied at checkout).
Mandatory Modules Details
REG – Registration, Login & Profiles
Goal
Maintain accounts and roles, and ensure every command reaching the system carries an authenticated identity.
In particular, the REG module:
●	Creates accounts and assigns exactly one role: customer, restaurant, courier, or operator.
●	Authenticates users and establishes the session that every other module trusts.
●	Provides the seeded accounts that make demos repeatable.
●	Answers “who is this, and what role do they hold” for ORD, DLV, DASH and PRC.
From the user’s perspective, REG is the front door: nothing in the system is visible before login.

Requirements
●	R-REG-01 - REG shall create accounts holding exactly one role: customer | restaurant | courier | operator.
●	R-REG-02 - REG shall require an authenticated session for every command, including browsing menus. There is no guest access.
●	R-REG-03 - REG shall load seeded accounts, at least one per role, from the configuration file so that demos start from a known state.
ORD – Order & Restaurant Core (Backend)
Goal 
Maintain correct restaurant and order state while providing simple commands to browse, place, accept, prepare and complete orders.
The ORD module is the authoritative core of the simulator. It maintains the state of restaurants, menus and orders, and ensures the rules of the system are respected.
In particular, the ORD module:
●	Keeps each restaurant’s preparation queue in arrival order; every accepted order is prepared.
●	Manages the order lifecycle (placed, accepted, preparing, ready, picked_up, delivered) and menu item state (available, sold_out).
●	Validates permissions (customer, restaurant, courier, operator) for actions initiated from the dashboard.
●	Updates a simple read view that the dashboard uses to render the map, labels, and per-restaurant order queues.
●	Surfaces clear messages when an action cannot be completed (for example, ordering a sold-out item, or ordering from a paused restaurant).
From the user’s perspective, ORD behaviour is immediate and turn-based: after each action, the map and panels reflect the new state.
Responsibilities
●	Sanity checking: no skipped state transitions, no negative quantities, no order prepared out of turn.
●	Own the lifecycle of Order, Restaurant (open | paused | closed) and Menu Item (available | sold_out).
●	Validate permissions for each command.
●	Emit domain events for the UI/read model and other modules (e.g., delivery, pricing).
●	Provide a read model for DASH with per-restaurant queue length and order states.
Core Functionality
●	Preparation queue: accepted orders are prepared in arrival order, first in, first out.
●	Place: a customer submits order lines to one open restaurant (order → placed).
●	Accept / reject: staff accept an order (→ accepted, then queued for preparation) or reject it with a reason (→ rejected, terminal).
●	Ready: staff mark a prepared order ready, which makes it visible to DLV for pickup.
●	Cancel: a customer may cancel only while the order is still placed; afterwards cancellation is an operator action.
●	Restaurant status: open | paused | closed. A paused restaurant accepts no new orders but must still finish the orders it has in flight.
Requirements
●	R-ORD-01 - ORD shall load a configuration file describing the initial city and display it on the map:
○	Restaurant: name; status (open | paused | closed); lat/long position; menu
○	Menu Item: id; name; price; status (available | sold_out)
○	Courier: id; lat/long position; status
○	Customer: id; name; delivery address (lat/long)
●	R-ORD-02 - ORD shall prevent placing an order at a paused or closed restaurant, or an order containing a sold-out item.
●	R-ORD-03 - ORD shall prepare each restaurant’s accepted orders in arrival order. The queue sets the sequence of preparation only; no order is refused for want of capacity.
●	R-ORD-04 - ORD shall enforce the order lifecycle and reject any transition that skips a state; in particular, an order cannot be picked up before it is ready.
●	R-ORD-05 - ORD shall record all state transitions with an event id.
DLV – Courier & Delivery
Goal 
Assign each ready order to exactly one courier by a fixed rule, and track the delivery through to the customer’s door.
In particular, the DLV module:
●	Maintains courier state (offline, idle, assigned, carrying) and position on the seeded grid.
●	Assigns orders using one deterministic rule, with no reassignment once a courier has accepted.
●	Records the two handoffs that close a delivery: pickup at the restaurant, delivery to the customer.
●	Queues orders that no courier can take, and surfaces them to the operator.
From the user’s perspective, DLV is what turns a prepared meal into a delivered one: a courier is offered one order at a time, and either takes it or goes off duty.
Dispatch rule (fixed — this is not a design decision left to the team): when an order becomes ready, DLV offers it to the nearest idle on-duty courier by straight-line distance on the seeded coordinate grid, breaking ties by the lowest courier id. Route planning, travel time, traffic, and assignment optimality are out of scope and are not marked.
Responsibilities
●	Own the lifecycle of Courier (offline | idle | assigned | carrying).
●	Apply the dispatch rule and bind an order to exactly one courier, never more.
●	Emit delivery events for the UI/read model and for pricing.
Core Functionality
●	Duty toggle: a courier goes on duty (→ idle) or off duty (→ offline).
●	Offer and accept: accepting moves the courier to assigned; declining returns the order to the dispatch queue.
●	Pickup: the courier confirms pickup at the restaurant (order → picked_up, courier → carrying).
●	Deliver: the courier confirms delivery (order → delivered, courier → idle).
●	Dispatch queue: when no idle courier exists, the order waits and is retried whenever a courier becomes idle.
Requirements
●	R-DLV-01 - DLV shall assign an order only after the restaurant has marked it ready.
●	R-DLV-02 - DLV shall select an idle on-duty courier and shall not reassign an accepted order except by operator command.
●	R-DLV-03 - DLV shall allow a courier to hold at most one order at a time, and shall prevent a courier from going offline while carrying one.
●	R-DLV-04 - DLV shall hold orders with no available courier in a dispatch queue, and retry assignment whenever a courier becomes idle.
DASH – Simulator UI
Goal
Present a city map with restaurant and courier markers, and provide simple controls to place, accept, prepare, pick up and deliver orders.
The Simulator Dashboard is the main user interface where customers, restaurant staff, couriers and operators interact with {Montreal Eats}. It is always visible and shows the current city state.
More specifically, the dashboard contains the following elements:
●	A horizontal tab bar for the modules (Map, Orders, Delivery, Pricing & History).
●	An information area showing:
○	the currently logged-in user and their role
○	the selected restaurant name and quick stats (orders queued, in preparation, ready)
○	a Reset action to restore the initial scenario
○	an optional toggle to show/hide labels on the map
●	An output console that lists important system messages (successful placements and deliveries, validation errors).
●	A Map view: a 2D city map with restaurant and courier markers. Each restaurant marker shows:
○	a colour indicating how long its preparation queue is (short / building / long)
○	an optional label “Name · N queued”
○	clicking a marker opens a details panel with the order queue and quick actions
Responsibilities
●	Render restaurants and on-duty couriers at their lat/lon; scale to the city’s boundaries.
●	Encode queue length with colour and labels, and show only the commands the logged-in role is permitted to issue.
Core Functionality
●	Map Canvas: canvas scaled to [minLon, maxLon] × [minLat, maxLat].
●	Restaurant Markers: colour = queue length band; Courier Markers: shape or badge = courier state.
●	Labels: “Name · N queued”.
●	Details Panel: order queue with states; quick actions; small metrics.
●	Command Control: show the commands available for the current role.
●	Reset Seed: restore the initial state for repeatable demos.
Requirements
●	R-DASH-01 - DASH shall display only the actions permitted to the logged-in role:
○	Customer: browse menus; place an order; cancel a placed order; view own history.
○	Restaurant Owner/Staff: edit the menu and item availability; accept or reject; mark ready; pause the restaurant.
○	Courier: go on/off duty; accept an offer; confirm pickup; confirm delivery.
○	Operator: pause or reopen any restaurant; reassign a stalled order; view all orders and ledgers; refund a delivered order; restore the initial state.
●	R-DASH-02 - DASH shall render all restaurants and on-duty couriers as markers positioned by lat/lon within the current dataset bounds.
●	R-DASH-03 - DASH shall encode each restaurant’s preparation queue with three levels: long (red) at six or more queued orders, or when the restaurant is paused; building (amber) at three to five; short (green) otherwise.
●	R-DASH-04 - DASH shall disable Place Order when the restaurant is paused or closed, or when every item selected is sold out.
●	R-DASH-05 - DASH shall disable Confirm Pickup until the order is ready, and Confirm Delivery until it is picked_up.
●	R-DASH-06 - DASH shall apply visual updates of a successful command, log every command and error to the output console, and handle an empty map gracefully.
PRC – Pricing, Billing and Order History
Goal 
The PRC module calculates the cost of an order using a small, transparent set of rules, and keeps the record of what was ordered and what it cost.
It provides:
●	A simple fare: the sum of the order lines, plus a delivery fee and a service fee, with an optional small-order surcharge.
●	An order summary shown in the dashboard after delivery, including the computed cost.
●	A ledger of past orders and charges, which each user reads through a role-scoped history view, so that history is never a way around the permissions enforced elsewhere.
Requirements
●	R-PRC-01 - PRC shall compute the cost deterministically from the pricing rules and the order facts.
●	R-PRC-02 - PRC shall provide an order summary after delivery.
●	R-PRC-03 - PRC shall maintain a ledger of all orders and charges, holding for each order its final state, timestamps and total charge.
●	R-PRC-04 - PRC shall scope history by role: a customer sees only their own orders, a restaurant only its own, a courier only the deliveries they carried, and an operator all of them.
●	R-PRC-05 - PRC shall let an operator refund a delivered order, recording the refund in the ledger as a separate entry that leaves the original charge unchanged; the order moves to refunded.
