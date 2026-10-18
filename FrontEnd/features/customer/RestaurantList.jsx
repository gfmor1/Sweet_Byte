
function RestaurantList({ restaurants, onSelect }) {
  return (
    <div>
      <h2>Restaurants</h2>

      {restaurants.map((restaurant) => (
        <div key={restaurant.id}>
          <h3>{restaurant.name}</h3>
          <p>Status: {restaurant.status}</p>

          <button onClick={() => onSelect(restaurant)}>
            View Menu
          </button>
        </div>
      ))}
    </div>
  );
}

export default RestaurantList;
