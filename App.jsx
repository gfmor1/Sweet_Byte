
"use client";

import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CustomerDashboard from "./pages/CustomerDashboard";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);

  function handleLoginSuccess(loggedInUser) {
    setUser(loggedInUser);
  }

  function handleLogout() {
    setUser(null);
    setPage("login");
  }

  if (user !== null) {
    return (
      <div className="app-shell">
        <button onClick={handleLogout}>Logout</button>

        {user.role === "customer" ? (
          <CustomerDashboard />
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
          <Register />
        )}
      </div>
    </div>
  );
}

export default App;
