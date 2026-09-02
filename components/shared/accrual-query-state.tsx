"use client";

import type { ReactNode } from "react";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";

interface AccrualQueryStateProps {
  isLoading: boolean;
  isError?: boolean;
  title?: string;
  children: ReactNode;
}

/** Shared loading / API-error shell for accrual screens. */
export function AccrualQueryState({
  isLoading,
  isError,
  title = "Accrual-Daten nicht verfügbar",
  children,
}: AccrualQueryStateProps) {
  if (isLoading) return <LoadingSkeleton variant="page" />;
  if (isError) {
    return (
      <EmptyState
        title={title}
        description="Der Accrual-API-Endpunkt antwortet nicht. Prüfen Sie, ob der Server mit Accrual-Routen läuft (lokal: npm run dev im server-Ordner)."
      />
    );
  }
  return <>{children}</>;
}
