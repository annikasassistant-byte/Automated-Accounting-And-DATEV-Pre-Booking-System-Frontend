"use client";

import { FileQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-muted/30 to-card/50 px-6 py-16 text-center",
        className
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-card shadow-lg">
          <FileQuestion className="h-8 w-8 text-primary" strokeWidth={1.5} />
          <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-amber-500" />
        </div>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-8 rounded-xl px-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
