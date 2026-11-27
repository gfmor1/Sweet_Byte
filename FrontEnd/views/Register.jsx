
import { useState } from "react";
import { REGISTERABLE_ROLES, signUp } from "../services/authApi";
import { formatEnum } from "../services/enumApi";
import { StatusMessage, useStatus } from "../components/StatusMessage";

function Register({ onRegisterSuccess }) {
  const [role, setRole] = useState("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [status, show] = useStatus();
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();

    if (password !== confirmPassword) {
      show.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    show.clear();
    try {
      // creates the account for the chosen role and logs in (one backend call)
      const registration = { role, name, restaurantName };
      onRegisterSuccess(await signUp(email, password, registration));
    } catch (error) {
      show.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>SweetByte</h1>
      <h2>Create Account</h2>

      <form onSubmit={handleRegister}>
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          {REGISTERABLE_ROLES.map((value) => (
            <option key={value} value={value}>
              {formatEnum(value)}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        
        {role === "RESTAURANT_OWNER" && (
          <input
            type="text"
            placeholder="Restaurant Name"
            value={restaurantName}
            onChange={(event) => setRestaurantName(event.target.value)}
            required
          />
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>

      <StatusMessage status={status} />
    </div>
  );
}

export default Register;
