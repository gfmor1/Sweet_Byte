import { apiRequest, clearToken, getToken, setToken, SIGNED_OUT_EVENT } from "./apiClient";
import { useMocks } from "./config";

// Auth is handled by our backend: login/register return { token, user }.
// The token (a JWT) is kept in localStorage and sent on every call by apiClient.
// Profiles returned below have the GET /api/auth/me shape: { userId, name, email, role, ... }

// Login and register responses: keep the token, return the profile
function startSession({ token, user }) {
  setToken(token);
  return user;
}

// Roles that can self-register, each with its backend register call
// Operators are seeded only
const REGISTER_BY_ROLE = {
  CUSTOMER: (form) => registerCustomer(form),
  RESTAURANT_OWNER: (form) => registerRestaurantOwner(form),
  COURIER: (form) => registerCourier(form)
};

export const REGISTERABLE_ROLES = Object.keys(REGISTER_BY_ROLE);

// One step: creates the account for registration.role and logs in.
// registration = { role, name, restaurantName }. Returns the profile.
export function signUp(email, password, registration) {
  return REGISTER_BY_ROLE[registration.role]({ ...registration, email, password });
}

export async function registerCustomer({ email, password, name }) {
  return startSession(await apiRequest("/api/auth/register/customer", {
    method: "POST",
    body: { email, password, name }
  }));
}

export async function registerRestaurantOwner({ email, password, name, restaurantName }) {
  return startSession(await apiRequest("/api/auth/register/restaurant-owner", {
    method: "POST",
    body: { email, password, name, restaurantName }
  }));
}

// Mock mode only (NEXT_PUBLIC_USE_MOCKS=true): the backend cannot describe COURIER/OPERATOR
// accounts yet (/api/auth/me throws), so these demo accounts sign in locally, without the backend.
const MOCK_SESSION_KEY = "sweetbyte.mockUser";
const MOCK_ACCOUNTS = {
  "courier@sweetbyte.test": { userId: "mock-courier", name: "Demo Courier", role: "COURIER" },
  "operator@sweetbyte.test": { userId: "mock-operator", name: "Demo Operator", role: "OPERATOR" }
};

export async function registerCourier({ email, password, name }) {
  if (useMocks) {
    // Acts as the seeded mock courier for this browser session only; nothing is stored afterwards.
    const profile = { ...MOCK_ACCOUNTS["courier@sweetbyte.test"], name };
    window.sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(profile));
    return profile;
  }
  return startSession(await apiRequest("/api/auth/register/courier", {
    method: "POST",
    body: { email, password, name }
  }));
}

function readMockUser() {
  if (!useMocks) return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(MOCK_SESSION_KEY));
  } catch {
    return null;
  }
}

// Role of the local mock session (courier/operator), or null for a real session
export function mockSessionRole() {
  return readMockUser()?.role ?? null;
}

// Returning user: the backend checks the password and returns the token + profile
export async function login(email, password) {
  const mockAccount = useMocks ? MOCK_ACCOUNTS[email.trim().toLowerCase()] : null;
  if (mockAccount) {
    if (password !== "demo123") throw new Error("Invalid login credentials");
    const profile = { ...mockAccount, email: email.trim().toLowerCase() };
    window.sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(profile));
    return profile;
  }
  return startSession(await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password }
  }));
}

// The logged-in user's SweetByte profile (403 = the account behind the token no longer exists)
export function getMe() {
  return apiRequest("/api/auth/me");
}

// Page load / reload: the token stays in this browser; null = not logged in
export async function getCurrentUser() {
  const mockUser = readMockUser();
  if (mockUser) return mockUser;
  if (!getToken()) return null;
  try {
    return await getMe();
  } catch (error) {
    if (error.status === 401) return null; // expired token, already cleared by apiClient
    throw error;
  }
}

// Session ended outside our logout button: expired token, or logout in another tab.
// Returns an unsubscribe function.
export function onSignedOut(callback) {
  const onStorage = (event) => {
    if (event.key === "sweetbyte.token" && event.newValue === null) callback();
  };
  window.addEventListener(SIGNED_OUT_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SIGNED_OUT_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export async function logout() {
  if (readMockUser()) {
    window.sessionStorage.removeItem(MOCK_SESSION_KEY);
    return;
  }
  // JWTs are stateless: logging out = forgetting the token in this browser
  clearToken();
}
