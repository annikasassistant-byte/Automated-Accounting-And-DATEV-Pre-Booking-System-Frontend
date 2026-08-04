"use client";

import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

/** CSS-only loader — avoids Framer Motion removeChild races during route changes. */
export function BrandedLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center gap-6",
        className
      )}
      role="status"
      aria-label="Laden"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 [animation-duration:2.4s]" />
        <div className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-primary/40 [animation-direction:reverse] [animation-duration:1.2s]" />
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <Layers className="h-4 w-4" />
        </div>
      </div>
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-foreground">Automated Accounting</p>
        <div className="mx-auto h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
