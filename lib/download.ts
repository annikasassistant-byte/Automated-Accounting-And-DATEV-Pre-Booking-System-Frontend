import {
  API_V1,
  getOrCreateDeviceId,
  getStoredAccessToken,
  getStoredRefreshToken,
  persistTokens,
  clearTokens,
} from "@/services/config";

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  try {
    const res = await fetch(`${API_V1}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Device-Id": getOrCreateDeviceId(),
        "X-Device-Name": "AA Web Client",
      },
      body: JSON.stringify({
        ...(refreshToken ? { refreshToken } : {}),
        deviceId: getOrCreateDeviceId(),
      }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const json = await res.json();
    const accessToken = json?.data?.accessToken as string | undefined;
    const nextRefresh =
      (json?.data?.refreshToken as string | undefined) || refreshToken || null;
    if (accessToken) {
      persistTokens(accessToken, nextRefresh);
      return accessToken;
    }
    return "";
  } catch {
    clearTokens();
  }
  return null;
}

async function authorizedFetch(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = getStoredAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Device-Id", getOrCreateDeviceId());
  headers.set("X-Device-Name", "AA Web Client");
  if (!headers.has("Accept")) headers.set("Accept", "*/*");

  const res = await fetch(url, { ...init, headers, credentials: "include" });
  if (res.status === 401 && retry) {
    const next = await refreshAccessToken();
    if (next !== null) return authorizedFetch(url, init, false);
  }
  return res;
}

/** Download a protected API file with cookie/Bearer auth. */
export async function downloadAuthenticatedFile(
  pathOrUrl: string,
  filename: string
): Promise<void> {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${API_V1}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl.replace(/^\/api\/v1/, "")}`;

  const res = await authorizedFetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Open a protected file in a new tab (blob URL). */
export async function previewAuthenticatedFile(pathOrUrl: string): Promise<void> {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${API_V1}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl.replace(/^\/api\/v1/, "")}`;

  const res = await authorizedFetch(url);
  if (!res.ok) throw new Error(`Preview failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
