"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import type { UserRole } from "@/types";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useLazyGetProfileQuery } from "@/services/authApi";
import { mapServerUserToClient } from "@/services/auth-mappers";
import { hardNavigate } from "@/lib/hard-navigate";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const pathname = usePathname();
  const { isAuthenticated, user, hasRole, setUser, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [fetchProfile] = useLazyGetProfileQuery();
  const redirectingRef = useRef(false);

  // Wait for Zustand persist rehydration before reading auth state.
  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) setHydrated(true);
    };

    if (useAuthStore.persist.hasHydrated()) {
      finish();
      return () => {
        cancelled = true;
      };
    }

    const unsub = useAuthStore.persist.onFinishHydration(finish);
    void useAuthStore.persist.rehydrate();

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      try {
        const profile = await fetchProfile().unwrap();
        if (cancelled) return;
        setUser(mapServerUserToClient(profile));
      } catch {
        if (cancelled) return;
        if (useAuthStore.getState().isAuthenticated) logout();
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, fetchProfile, setUser, logout]);

  useEffect(() => {
    if (!hydrated || !sessionChecked || redirectingRef.current) return;
    if (!isAuthenticated || !user) {
      redirectingRef.current = true;
      // Hard navigation avoids App Router + portal removeChild races.
      hardNavigate(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (allowedRoles && !allowedRoles.some((r) => hasRole(r))) {
      redirectingRef.current = true;
      hardNavigate("/unauthorized");
    }
  }, [
    hydrated,
    sessionChecked,
    isAuthenticated,
    user,
    allowedRoles,
    hasRole,
    pathname,
  ]);

  if (!hydrated || !sessionChecked || !isAuthenticated || !user) {
    return <LoadingSkeleton variant="page" />;
  }

  if (allowedRoles && !allowedRoles.some((r) => hasRole(r))) {
    return <LoadingSkeleton variant="page" />;
  }

  return <>{children}</>;
}
