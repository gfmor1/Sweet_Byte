function IncomingOrders({ orders, onAccept, onReject }) {
  const incoming = orders.filter((order) => order.status === "placed");

  return (
    <div>
      <h2>Incoming Orders</h2>

      {incoming.length === 0 && <p>No incoming orders.</p>}

      {incoming.map((order) => (
        <div key={order.id} className="order-card">
          <h3>Order #{order.id}</h3>
          <p>Status: {order.status}</p>

          {order.items.map((item) => (
            <p key={item.id}>
              {item.name} x {item.quantity}
            </p>
          ))}

          <button onClick={() => onAccept(order.id)}>Accept</button>{" "}
          <button onClick={() => onReject(order.id)}>Reject</button>
        </div>
      ))}
    </div>
  );
}

export default IncomingOrders;
