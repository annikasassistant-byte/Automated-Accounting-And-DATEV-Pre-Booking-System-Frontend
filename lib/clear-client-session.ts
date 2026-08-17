import { clearTokens } from "@/services/config";
import { clearPasswordResetFlow } from "@/lib/password-reset-flow";

const AUTH_LOCAL_KEYS = [
  "aa-auth",
  "depth-access-token",
  "depth-refresh-token",
];

const CLIENT_COOKIE_NAMES = [
  "csrf_token",
  "access_token",
  "refresh_token",
];

function expireCookie(name: string) {
  if (typeof document === "undefined") return;
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  const paths = ["/", "/api", "/api/v1"];
  for (const path of paths) {
    document.cookie = `${name}=; expires=${expires}; path=${path}`;
    document.cookie = `${name}=; expires=${expires}; path=${path}; SameSite=Lax`;
    document.cookie = `${name}=; expires=${expires}; path=${path}; SameSite=None; Secure`;
  }
}

/**
 * Wipe client auth remnants so the next login starts with a clean token/cookie set.
 * Keeps theme + device-id (not credentials).
 */
export function clearClientSession() {
  if (typeof window === "undefined") return;

  clearTokens();
  clearPasswordResetFlow();

  try {
    for (const key of AUTH_LOCAL_KEYS) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }

  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }

  for (const name of CLIENT_COOKIE_NAMES) expireCookie(name);
}
