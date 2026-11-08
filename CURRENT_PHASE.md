You should implement all use cases for the three modules listed below. See
the requirements for each module in the project description in Moodle.
● DLV – Courier & Delivery:
○ Courier state (offline, idle, assigned, carrying);
○ Assignment of a ready order to the nearest idle on-duty courier by
straight-line distance, with ties broken by the lowest courier id;
○ At most one order per courier, and no going offline while carrying
one;
○ The dispatch queue, retried whenever a courier becomes idle;
○ Pickup and delivery confirmed by the courier;
○ A stalled order can only be reassigned by operator command.
● PRC – Pricing, Billing & Order History:
○ A fare computed deterministically from the order lines, a delivery
fee, a service fee and an optional small-order surcharge;
○ An order summary is created after delivery; 
○ A ledger holding each order’s final state, timestamps and total
charge;
○ History scoped by role;
○ The operator refund of a delivered order, recorded as a separate
ledger entry.
● DASH – Simulator UI (complete):
○ The city map scaled to the dataset bounds, with restaurant and onduty courier markers;
○ The three queue-colour bands of R-DASH-03;
○ Only the commands permitted to the logged-in role;
○ Place Order, Confirm Pickup and Confirm Delivery disabled as
required by R-DASH-04 and R-DASH-05;
○ An output console that logs every command and every error;
○ Graceful handling of an empty map;
○ The Reset action that returns the system to its initial state.
Pricing rules. The delivery fee, the service fee, and the threshold and
amount of the small-order surcharge must be read from the configuration file,
not written into the code, and must be stated in your report. At the
demonstration the sponsor will compute the total of one order by hand from
those values and compare it with what your system charged (R-PRC-01).
Route planning, travel time, traffic and assignment optimality remain out of
scope, as stated in the project description. The optional modules (NTF, RVW,
PROMO) are not marked in this phase.