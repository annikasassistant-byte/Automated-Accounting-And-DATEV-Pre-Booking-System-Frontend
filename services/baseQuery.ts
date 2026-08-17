import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import {
  API_V1,
  getOrCreateDeviceId,
  getStoredAccessToken,
  getStoredRefreshToken,
  persistTokens,
} from "@/services/config";
import type { ApiSuccess, AuthTokensPayload } from "@/services/types";
import { useAuthStore } from "@/lib/auth-store";

function requestUrl(args: string | FetchArgs): string {
  return typeof args === "string" ? args : args.url;
}

function isAuthSessionRequest(url: string): boolean {
  return /\/auth\/(login|logout|logout-all|refresh|register|forgot-password|verify-otp|reset-password)/.test(
    url
  );
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_V1,
  credentials: "include",
  prepareHeaders: (headers) => {
    const token = getStoredAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    headers.set("X-Device-Id", getOrCreateDeviceId());
    headers.set("X-Device-Name", "AA Web Client");
    return headers;
  },
});

/** Shared RTK base query: httpOnly cookies + optional in-memory Bearer, cookie-first refresh. */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && !isAuthSessionRequest(requestUrl(args))) {
    const refreshToken = getStoredRefreshToken();
    const refreshResult = await rawBaseQuery(
      {
        url: "/auth/refresh",
        method: "POST",
        body: {
          ...(refreshToken ? { refreshToken } : {}),
          deviceId: getOrCreateDeviceId(),
        },
      },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      const payload = (refreshResult.data as ApiSuccess<Partial<AuthTokensPayload>>).data;
      if (payload?.accessToken) {
        persistTokens(payload.accessToken, payload.refreshToken ?? refreshToken ?? null);
      }
      result = await rawBaseQuery(args, api, extraOptions);
      return result;
    }

    useAuthStore.getState().logout();
  }

  return result;
};

export { rawBaseQuery };
