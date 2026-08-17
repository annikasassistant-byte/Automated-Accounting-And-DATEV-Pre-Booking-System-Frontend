"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TableScroll({
  children,
  className,
  hint = true,
}: {
  children: ReactNode;
  className?: string;
  hint?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {hint ? (
        <p className="mb-2 text-xs text-muted-foreground md:hidden">Wischen für weitere Spalten</p>
      ) : null}
      <div className="overflow-auto overscroll-x-contain">{children}</div>
    </div>
  );
}
