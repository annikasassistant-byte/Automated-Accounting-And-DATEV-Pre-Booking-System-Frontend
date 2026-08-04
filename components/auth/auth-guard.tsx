"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import type { UserRole } from "@/types";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useLazyGetProfileQuery } from "@/services/authApi";
import { mapServerUserToClient } from "@/services/auth-mappers";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, hasRole, setUser, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [fetchProfile] = useLazyGetProfileQuery();

  useEffect(() => {
    setHydrated(true);
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
        if (isAuthenticated) logout();
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, fetchProfile, setUser, logout, isAuthenticated]);

  useEffect(() => {
    if (!hydrated || !sessionChecked) return;
    if (!isAuthenticated || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (allowedRoles && !allowedRoles.some((r) => hasRole(r))) {
      router.replace("/unauthorized");
    }
  }, [
    hydrated,
    sessionChecked,
    isAuthenticated,
    user,
    allowedRoles,
    hasRole,
    router,
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
