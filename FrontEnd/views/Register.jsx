
import { useState } from "react";
import {
  registerCustomer,
  registerRestaurantOwner,
  signUp
} from "../services/authApi";
import { formatEnum } from "../services/enumApi";

// Roles that can self-register, each with its backend register call
// TODO: COURIER once the backend has /api/auth/register/courier (operators are seeded only)
const REGISTER_BY_ROLE = {
  CUSTOMER: (form) =>
    registerCustomer({ name: form.name, deliveryAddress: form.deliveryAddress }),
  RESTAURANT_OWNER: (form) =>
    registerRestaurantOwner({ name: form.name, restaurantName: form.restaurantName })
};

function Register({ onRegisterSuccess }) {
  const [role, setRole] = useState("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      // 1. Supabase account (gives the JWT), 2. SweetByte account for the chosen role
      await signUp(email, password);
      const profile = await REGISTER_BY_ROLE[role]({ name, deliveryAddress, restaurantName });
      onRegisterSuccess(profile);
    } catch (error) {
      setMessage(error.message);
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
          {Object.keys(REGISTER_BY_ROLE).map((value) => (
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

        {role === "CUSTOMER" && (
          <input
            type="text"
            placeholder="Delivery Address"
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            required
          />
        )}

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

      <p>{message}</p>
    </div>
  );
}

export default Register;
