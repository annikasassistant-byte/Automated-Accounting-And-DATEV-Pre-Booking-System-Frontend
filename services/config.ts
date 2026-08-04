/** Backend API origin — override with NEXT_PUBLIC_API_URL */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

export const API_V1 = `${API_BASE_URL}/api/v1`;

export const AUTH_TOKEN_KEY = "depth-access-token";
export const REFRESH_TOKEN_KEY = "depth-refresh-token";
export const DEVICE_ID_KEY = "depth-device-id";

/** Tab-scoped session keys — survive hardNavigate; cleared on tab close. */
const ACCESS_SESSION_KEY = "aa-access-token";
const REFRESH_SESSION_KEY = "aa-refresh-token";

/**
 * In-memory + sessionStorage token cache (never long-lived localStorage).
 * httpOnly cookies are preferred when same-site; cross-origin (Vercel → Render)
 * requires Bearer tokens that survive full-page navigations after login.
 */
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

function clearLegacyLocalStorageTokens() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function readSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  clearLegacyLocalStorageTokens();
  if (memoryAccessToken) return memoryAccessToken;
  memoryAccessToken = readSession(ACCESS_SESSION_KEY);
  return memoryAccessToken;
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  clearLegacyLocalStorageTokens();
  if (memoryRefreshToken) return memoryRefreshToken;
  memoryRefreshToken = readSession(REFRESH_SESSION_KEY);
  return memoryRefreshToken;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function persistTokens(accessToken?: string | null, refreshToken?: string | null) {
  if (typeof window === "undefined") return;
  clearLegacyLocalStorageTokens();
  if (accessToken !== undefined) {
    memoryAccessToken = accessToken || null;
    writeSession(ACCESS_SESSION_KEY, memoryAccessToken);
  }
  if (refreshToken !== undefined) {
    memoryRefreshToken = refreshToken || null;
    writeSession(REFRESH_SESSION_KEY, memoryRefreshToken);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  memoryAccessToken = null;
  memoryRefreshToken = null;
  writeSession(ACCESS_SESSION_KEY, null);
  writeSession(REFRESH_SESSION_KEY, null);
  clearLegacyLocalStorageTokens();
}
