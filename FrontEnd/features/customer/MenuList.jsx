function MenuList({ items }) {
  return (
    <div>
      <h2>Menu</h2>

      {items.map((item) => (
        <div key={item.id}>
          <h3>{item.name}</h3>
          <p>Price: ${item.price.toFixed(2)}</p>

          <p>
            Status: {item.status === "available"
              ? "Available"
              : "Sold Out"}
          </p>
        </div>
      ))}
    </div>
  );
}

export default MenuList;