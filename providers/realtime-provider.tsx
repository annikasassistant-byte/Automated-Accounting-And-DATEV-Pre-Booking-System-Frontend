"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, getStoredAccessToken } from "@/services/config";
import { useAuthStore } from "@/lib/auth-store";
import { authApi } from "@/services/authApi";
import { useAppDispatch } from "@/store/hooks";

/**
 * Connects to Socket.IO when authenticated; refreshes profile on user updates.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const dispatch = useAppDispatch();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const token = getStoredAccessToken();
    const socket = io(API_BASE_URL, {
      path: "/socket.io",
      auth: token ? { token } : {},
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("server:user_updated", () => {
      dispatch(authApi.util.invalidateTags(["Profile"]));
    });
    socket.on("server:force_logout", () => {
      useAuthStore.getState().logout();
    });
    socket.on("connect_error", () => {
      // Silent — realtime is best-effort
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, dispatch]);

  return <>{children}</>;
}
