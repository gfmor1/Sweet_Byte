import { apiRequest } from "./apiClient";
import { supabase } from "./supabaseClient";

// Auth = Supabase account (email + password, gives the JWT)
//      + SweetByte account (our users row: role, restaurant…), created by /api/auth/register/*.
// Profiles returned below have the GET /api/auth/me shape: { userId, name, email, role, ... }

// Supabase returns { data, error } instead of throwing
function throwIfError(error) {
  if (error) throw new Error(error.message);
}

// Step 1 of registration: create the Supabase account (session = logged in right away)
// If a previous attempt created the Supabase account but step 2 failed, sign in instead
// so the user can retry without a "User already registered" dead end.
export async function signUp(email, password) {
  let { data, error } = await supabase.auth.signUp({ email, password });
  if (error && /already registered/i.test(error.message)) {
    ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
  }
  throwIfError(error);
  // "Confirm email" enabled in Supabase: no session until the user clicks the email link
  if (!data.session) {
    throw new Error("Check your email to confirm your account, then log in");
  }
}

// Step 2 of registration: create the SweetByte account for the signed-up user
export function registerCustomer({ name, deliveryAddress }) {
  return apiRequest("/api/auth/register/customer", {
    method: "POST",
    body: { name, deliveryAddress }
  });
}

export function registerRestaurantOwner({ name, restaurantName }) {
  return apiRequest("/api/auth/register/restaurant-owner", {
    method: "POST",
    body: { name, restaurantName }
  });
}

// TODO: registerCourier (backend endpoint not built yet)

// Returning user: Supabase checks the password, then we load the SweetByte profile
export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  throwIfError(error);
  return getMe();
}

// The logged-in user's SweetByte profile (403 = Supabase account without a SweetByte account)
export function getMe() {
  return apiRequest("/api/auth/me");
}

// Page load / reload: Supabase keeps the session in the browser; null = not logged in
export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session ? getMe() : null;
}

// Session ended outside our logout button (other tab, expired refresh token).
// Returns an unsubscribe function.
export function onSignedOut(callback) {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") callback();
  });
  return () => data.subscription.unsubscribe();
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  throwIfError(error);
}
