import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandedLoader } from "@/components/shared/branded-loader";

export function LoadingSkeleton({
  variant = "card",
  className,
}: {
  variant?: "card" | "page" | "table" | "chart" | "timeline" | "form";
  className?: string;
}) {
  if (variant === "page") {
    return (
      <div className={cn("space-y-8", className)}>
        <BrandedLoader />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-4 rounded-2xl border border-border/50 p-4", className)}>
        <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "chart") {
    return <Skeleton className={cn("h-[300px] w-full rounded-2xl", className)} />;
  }

  if (variant === "timeline") {
    return (
      <div className={cn("mx-auto max-w-lg space-y-6", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <Skeleton className="h-24 flex-1 rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("mx-auto max-w-md space-y-4", className)}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    );
  }

  return <Skeleton className={cn("h-44 w-full rounded-2xl", className)} />;
}
