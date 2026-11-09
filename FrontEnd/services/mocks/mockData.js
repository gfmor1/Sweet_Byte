import { calculateFare } from "../config";

// Fresh seed on every call, so Reset can restore it. Timestamps are relative to "now".
export function createSeed() {
  const now = Date.now();
  const ago = (ms) => new Date(now - ms).toISOString();
  const MIN = 60 * 1000;

  const restaurants = [
    { id: 1, name: "Downtown Patisserie", status: "OPEN", latitude: 45.5017, longitude: -73.5673 },
    { id: 2, name: "Plateau Sweet Shop", status: "OPEN", latitude: 45.5236, longitude: -73.5815 },
    { id: 3, name: "Mile End Bakery", status: "PAUSED", latitude: 45.523, longitude: -73.599 },
    { id: 4, name: "Old Port Gelato", status: "OPEN", latitude: 45.5075, longitude: -73.554 },
  ];

  const couriers = [
    { id: 1, name: "Ava Tremblay", status: "CARRYING", latitude: 45.5236, longitude: -73.5815, currentOrderId: 1 },
    { id: 2, name: "Ben Roy", status: "ASSIGNED", latitude: 45.53, longitude: -73.58, currentOrderId: 2 },
    { id: 3, name: "Chloe Gagnon", status: "OFFLINE", latitude: 45.495, longitude: -73.58, currentOrderId: 3 },
  ];

  const itemPool = [
    { id: 11, name: "Chocolate Croissant", price: 4.5 },
    { id: 12, name: "Maple Eclair", price: 5.25 },
    { id: 13, name: "Gelato Cup", price: 6.0 },
  ];

  const order = (id, restaurantId, status, extra = {}) => {
    const restaurant = restaurants.find((r) => r.id === restaurantId);
    return {
      id,
      restaurantId,
      restaurantName: restaurant.name,
      customerName: "Sam Customer",
      status,
      courierId: null,
      offerAccepted: false,
      reason: null,
      items: [{ ...itemPool[id % itemPool.length], quantity: 2 }],
      placedAt: ago(40 * MIN),
      readyAt: null,
      deliveredAt: null,
      dropoffLatitude: restaurant.latitude + 0.008,
      dropoffLongitude: restaurant.longitude + 0.006,
      ...extra,
    };
  };

  const orders = [
    order(1, 2, "PICKED_UP", { courierId: 1, offerAccepted: true, readyAt: ago(15 * MIN) }),
    order(2, 1, "READY", { courierId: 2, readyAt: ago(30 * 1000) }),
    order(3, 4, "READY", { courierId: 3, offerAccepted: true, readyAt: ago(10 * MIN) }), // stalled: courier accepted, then went offline
    order(4, 1, "DELIVERED", {
      courierId: 2,
      offerAccepted: true,
      readyAt: ago(70 * MIN),
      deliveredAt: ago(60 * MIN),
    }),
    order(5, 4, "PREPARING"),
    // Filler queue entries to exercise the green/amber/red bands
    order(6, 2, "PLACED"),
    order(7, 2, "ACCEPTED"),
    order(8, 2, "PREPARING"),
    order(9, 1, "PLACED"),
    order(10, 1, "PLACED"),
    order(11, 1, "ACCEPTED"),
    order(12, 1, "ACCEPTED"),
    order(13, 1, "PREPARING"),
    order(14, 1, "PREPARING"),
    order(15, 4, "READY", { readyAt: ago(3 * MIN) }), // waiting in the dispatch queue
  ];

  const subtotal = (o) => o.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveredOrder = orders.find((o) => o.id === 4);

  return {
    restaurants,
    couriers,
    orders,
    dispatchQueue: [15],
    ledger: [
      {
        entryId: 1,
        orderId: 4,
        type: "CHARGE",
        finalState: "DELIVERED",
        recordedAt: deliveredOrder.deliveredAt,
        amount: calculateFare(subtotal(deliveredOrder)).total,
        currency: "CAD",
      },
    ],
    nextOrderId: 16,
    nextLedgerId: 2,
  };
}
