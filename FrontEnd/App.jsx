
"use client";

import { useState } from "react";
import Login from "./views/Login";
import Register from "./views/Register";
import CustomerDashboard from "./views/CustomerDashboard";
import RestaurantDashboard from "./views/RestaurantDashboard";
import { logout } from "./services/authApi";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);

  function handleLoginSuccess(loggedInUser) {
    setUser(loggedInUser);
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setPage("login");
  }

  if (user !== null) {
    return (
      <div className="app-shell">
        <button onClick={handleLogout}>Logout</button>

        {user.role === "CUSTOMER" ? (
          <CustomerDashboard />
        ) : user.role === "RESTAURANT_OWNER" ? (
          <RestaurantDashboard restaurantId={user.restaurantId} />
        ) : (
          <p>Dashboard not implemented yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <button onClick={() => setPage("login")}>
        Login
      </button>

      <button onClick={() => setPage("register")}>
        Register
      </button>

      <div className="auth-page">
        {page === "login" ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
          <Register onRegisterSuccess={handleLoginSuccess} />
        )}
      </div>
    </div>
  );
}

export default App;
