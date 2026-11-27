import { trackLoading } from "./loadingTracker";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"; // "" = same origin (/api via nginx)

// Login token (JWT issued by the backend at login/register), kept in this browser.
// localStorage can throw (private mode, blocked storage): then the user just stays logged out.
const TOKEN_KEY = "sweetbyte.token";
export const SIGNED_OUT_EVENT = "sweetbyte:signed-out";

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable: the session lasts until the page reloads
  }
}

// Forget the token and tell the app (App.jsx listens through onSignedOut)
export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing stored
  }
  window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
}

// Every backend call shows the loading bar while it runs
export function apiRequest(path, options) {
  return trackLoading(sendRequest(path, options));
}

async function sendRequest(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // Logged in: send the JWT so the backend knows who is acting
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  // 401 with a token = expired or no longer valid (e.g. backend restarted with a new key): log out
  if (response.status === 401 && token) clearToken();

  if (!response.ok) {
    // GlobalExceptionHandler returns { status, error, message }
    let message = `Request failed (${response.status})`;
    try {
      const error = await response.json();
      if (error.message) message = error.message;
    } catch {
      // body was not JSON
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}
