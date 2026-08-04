/** Backend API origin — override with NEXT_PUBLIC_API_URL */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

export const API_V1 = `${API_BASE_URL}/api/v1`;

export const AUTH_TOKEN_KEY = "depth-access-token";
export const REFRESH_TOKEN_KEY = "depth-refresh-token";
export const DEVICE_ID_KEY = "depth-device-id";

/**
 * In-memory token cache only (never localStorage).
 * Auth prefers httpOnly cookies set by the API; memory tokens support Socket.IO
 * and same-tab Bearer fallback after login/refresh.
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

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  clearLegacyLocalStorageTokens();
  return memoryAccessToken;
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  clearLegacyLocalStorageTokens();
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
  if (accessToken !== undefined) memoryAccessToken = accessToken || null;
  if (refreshToken !== undefined) memoryRefreshToken = refreshToken || null;
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  memoryAccessToken = null;
  memoryRefreshToken = null;
  clearLegacyLocalStorageTokens();
}
