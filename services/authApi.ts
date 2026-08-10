import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "@/services/baseQuery";
import { clearTokens, getOrCreateDeviceId, getStoredRefreshToken } from "@/services/config";
import type {
  ApiSuccess,
  AuthTokensPayload,
  ForgotPasswordPayload,
  MessagePayload,
  ServerUser,
  VerifyOtpPayload,
} from "@/services/types";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Profile", "Users"],
  endpoints: (builder) => ({
    register: builder.mutation<
      AuthTokensPayload,
      {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone?: string;
      }
    >({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body: { ...body, deviceId: getOrCreateDeviceId(), deviceName: "AA Web Client" },
      }),
      transformResponse: (response: ApiSuccess<AuthTokensPayload>) => response.data,
    }),

    login: builder.mutation<AuthTokensPayload, { email: string; password: string }>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body: { ...body, deviceId: getOrCreateDeviceId(), deviceName: "AA Web Client" },
      }),
      transformResponse: (response: ApiSuccess<AuthTokensPayload>) => response.data,
      invalidatesTags: ["Profile"],
    }),

    logout: builder.mutation<MessagePayload, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
        body: { refreshToken: getStoredRefreshToken() },
      }),
      transformResponse: (response: ApiSuccess<MessagePayload>) => response.data,
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          clearTokens();
        }
      },
    }),

    forgotPassword: builder.mutation<ForgotPasswordPayload, { email: string }>({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
      transformResponse: (response: ApiSuccess<ForgotPasswordPayload>) => response.data,
    }),

    verifyOtp: builder.mutation<VerifyOtpPayload, { email: string; otp: string }>({
      query: (body) => ({ url: "/auth/verify-otp", method: "POST", body }),
      transformResponse: (response: ApiSuccess<VerifyOtpPayload>) => response.data,
    }),

    resetPassword: builder.mutation<
      MessagePayload,
      { password: string; resetToken?: string; token?: string; email?: string; otp?: string }
    >({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
      transformResponse: (response: ApiSuccess<MessagePayload>) => response.data,
    }),

    changePassword: builder.mutation<
      MessagePayload,
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({ url: "/auth/change-password", method: "POST", body }),
      transformResponse: (response: ApiSuccess<MessagePayload>) => response.data,
    }),

    getProfile: builder.query<ServerUser, void>({
      query: () => "/users/me",
      transformResponse: (response: ApiSuccess<ServerUser>) => response.data,
      providesTags: ["Profile"],
    }),

    updateProfile: builder.mutation<
      ServerUser,
      {
        firstName?: string;
        lastName?: string;
        phone?: string | null;
        notificationPreferences?: {
          emailAlerts?: boolean;
          platformAnnouncements?: boolean;
        };
      }
    >({
      query: (body) => ({ url: "/users/me", method: "PATCH", body }),
      transformResponse: (response: ApiSuccess<ServerUser>) => response.data,
      invalidatesTags: ["Profile"],
    }),

    updateNotificationPreferences: builder.mutation<
      ServerUser,
      {
        emailAlerts?: boolean;
        platformAnnouncements?: boolean;
      }
    >({
      query: (body) => ({
        url: "/users/me/notification-preferences",
        method: "PATCH",
        body,
      }),
      transformResponse: (response: ApiSuccess<ServerUser>) => response.data,
      invalidatesTags: ["Profile"],
    }),

    getUsers: builder.query<
      { data: ServerUser[]; meta?: unknown },
      { page?: number; limit?: number; search?: string; role?: string } | void
    >({
      query: (params) => ({
        url: "/users",
        params: { limit: 100, ...(params || {}) },
      }),
      transformResponse: (response: ApiSuccess<ServerUser[] | { data: ServerUser[] }>) => {
        const raw = response.data as ServerUser[] | { data: ServerUser[] };
        const list = Array.isArray(raw) ? raw : raw?.data || [];
        return { data: list, meta: response.meta };
      },
      providesTags: ["Users"],
    }),

    updateUser: builder.mutation<
      ServerUser,
      {
        id: string;
        body: {
          firstName?: string;
          lastName?: string;
          phone?: string | null;
          isActive?: boolean;
          role?: "admin" | "user";
          roleSlug?: "admin" | "user";
        };
      }
    >({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      transformResponse: (response: ApiSuccess<ServerUser>) => response.data,
      invalidatesTags: ["Users", "Profile"],
    }),

    createUser: builder.mutation<
      ServerUser,
      {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone?: string;
        role?: "admin" | "user";
      }
    >({
      query: (body) => ({ url: "/users", method: "POST", body }),
      transformResponse: (response: ApiSuccess<ServerUser>) => response.data,
      invalidatesTags: ["Users"],
    }),

    deleteUser: builder.mutation<{ success?: boolean }, string>({
      query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
      invalidatesTags: ["Users"],
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useVerifyOtpMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useUpdateProfileMutation,
  useUpdateNotificationPreferencesMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = authApi;
