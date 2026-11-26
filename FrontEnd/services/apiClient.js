import { supabase } from "./supabaseClient";
import { trackLoading } from "./loadingTracker";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"; // "" = same origin (/api via nginx)

// Every backend call shows the loading bar while it runs
export function apiRequest(path, options) {
  return trackLoading(sendRequest(path, options));
}

async function sendRequest(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // Logged in: send the Supabase JWT so the backend knows who is acting.
  // getSession() returns the stored session and refreshes the token if it expired.
  const { data } = await supabase.auth.getSession();
  if (data.session) headers["Authorization"] = `Bearer ${data.session.access_token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

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
