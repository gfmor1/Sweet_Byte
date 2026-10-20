import { apiRequest } from "./apiClient";
import { supabase } from "./supabaseClient";
import { trackLoading } from "./loadingTracker";

// Auth = Supabase account (email + password, gives the JWT)
//      + SweetByte account (our users row: role, restaurant…), created by /api/auth/register/*.
// Profiles returned below have the GET /api/auth/me shape: { userId, name, email, role, ... }

// Supabase returns { data, error } instead of throwing
function throwIfError(error) {
  if (error) throw new Error(error.message);
}

// Step 1 of registration: create the Supabase account.
// The form (role, name, address…) is saved in the Supabase user's metadata, so if
// "Confirm email" is on, the first login after confirming can finish step 2 by itself.
// If a previous attempt created the Supabase account but step 2 failed, sign in instead
// so the user can retry without a "User already registered" dead end.
// Returns true when logged in right away, false when the email must be confirmed first.
export async function signUp(email, password, registration) {
  let { data, error } = await trackLoading(
    supabase.auth.signUp({ email, password, options: { data: { registration } } })
  );
  if (error && /already registered/i.test(error.message)) {
    ({ data, error } = await trackLoading(supabase.auth.signInWithPassword({ email, password })));
  }
  throwIfError(error);
  return data.session !== null;
}

// Roles that can self-register, each with its backend register call
// TODO: COURIER once the backend has /api/auth/register/courier (operators are seeded only)
const REGISTER_BY_ROLE = {
  CUSTOMER: (form) => registerCustomer(form),
  RESTAURANT_OWNER: (form) => registerRestaurantOwner(form)
};

export const REGISTERABLE_ROLES = Object.keys(REGISTER_BY_ROLE);

// Step 2 of registration: registration = { role, name, deliveryAddress, restaurantName }
export function registerForRole(registration) {
  return REGISTER_BY_ROLE[registration.role](registration);
}

// Logged into Supabase: load the SweetByte profile. A 403 means no SweetByte account yet;
// if sign-up saved a registration form (email confirmation case), finish registering now.
async function loadProfile(supabaseUser) {
  try {
    return await getMe();
  } catch (error) {
    const pending = supabaseUser?.user_metadata?.registration;
    if (error.status === 403 && pending) return registerForRole(pending);
    throw error;
  }
}

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
  const { data, error } = await trackLoading(supabase.auth.signInWithPassword({ email, password }));
  throwIfError(error);
  return loadProfile(data.user);
}

// The logged-in user's SweetByte profile (403 = Supabase account without a SweetByte account)
export function getMe() {
  return apiRequest("/api/auth/me");
}

// Page load / reload: Supabase keeps the session in the browser; null = not logged in
export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session ? loadProfile(data.session.user) : null;
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
  const { error } = await trackLoading(supabase.auth.signOut());
  throwIfError(error);
}
