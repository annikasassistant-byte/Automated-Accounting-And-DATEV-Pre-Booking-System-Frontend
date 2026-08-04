const EMAIL_KEY = "depth-reset-email";
const TOKEN_KEY = "depth-reset-token";

export function setResetEmail(email: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(EMAIL_KEY, email);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getResetEmail(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(EMAIL_KEY);
}

export function setResetToken(token: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getResetToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearPasswordResetFlow() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
