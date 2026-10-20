
"use client";

import { useEffect, useState } from "react";
import Login from "./views/Login";
import Register from "./views/Register";
import CustomerDashboard from "./views/CustomerDashboard";
import RestaurantDashboard from "./views/RestaurantDashboard";
import { getCurrentUser, logout, onSignedOut } from "./services/authApi";
import LoadingBar from "./components/LoadingBar";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");

  // Restore the logged-in user after a reload, and react to sign-outs from elsewhere
  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      // e.g. Supabase session without a SweetByte account (403 "register first")
      .catch((error) => setSessionMessage(error.message))
      .finally(() => setCheckingSession(false));

    return onSignedOut(() => {
      setUser(null);
      setPage("login");
    });
  }, []);

  function handleLoginSuccess(loggedInUser) {
    setUser(loggedInUser);
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setPage("login");
  }

  if (checkingSession) {
    return (
      <>
        <LoadingBar />
        <p>Loading...</p>
      </>
    );
  }

  if (user !== null) {
    return (
      <div className="app-shell">
        <LoadingBar />
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
      <LoadingBar />
      <button onClick={() => setPage("login")}>
        Login
      </button>

      <button onClick={() => setPage("register")}>
        Register
      </button>

      {sessionMessage && <p className="error-message">{sessionMessage}</p>}

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
