import { useState } from "react";
import { login } from "../services/authApi";
import { StatusMessage, useStatus } from "../components/StatusMessage";

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, show] = useStatus();

  async function handleLogin(event) {
    event.preventDefault();

    try {
      onLoginSuccess(await login(email, password));
    } catch (error) {
      show.error(error.message);
    }
  }

  return (
    <div>
      <h1>SweetByte</h1>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
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
        <button type="submit">Login</button>
      </form>

      <StatusMessage status={status} />
    </div>
  );
}

export default Login;
