const QUEUE_STATUSES = ["accepted", "preparing", "ready"];

function OrderQueue({ orders, onStartPreparing, onMarkReady }) {
  // FIFO: oldest accepted order first
  const queue = orders
    .filter((order) => QUEUE_STATUSES.includes(order.status))
    .sort((a, b) => a.acceptedAt - b.acceptedAt);

  // Only the oldest order still waiting may start preparing
  const nextOrder = queue.find((order) => order.status === "accepted");

  return (
    <div>
      <h2>Order Queue</h2>

      {queue.length === 0 && <p>No accepted orders in the queue.</p>}

      {queue.map((order, index) => (
        <div key={order.id} className="order-card">
          <h3>
            #{index + 1} in queue: Order #{order.id}
          </h3>
          <p>Status: {order.status}</p>

          {order.items.map((item) => (
            <p key={item.id}>
              {item.name} x {item.quantity}
            </p>
          ))}

          {order.status === "accepted" && (
            <button
              onClick={() => onStartPreparing(order.id)}
              disabled={order !== nextOrder}
            >
              Start Preparing
            </button>
          )}

          {order.status === "preparing" && (
            <button onClick={() => onMarkReady(order.id)}>
              Mark Ready
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default OrderQueue;
