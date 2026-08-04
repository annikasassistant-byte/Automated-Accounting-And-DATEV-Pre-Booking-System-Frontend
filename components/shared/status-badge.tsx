import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeStatus = "active" | "inactive" | "pending" | "admin" | "user";

const styles: Record<BadgeStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  inactive: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  admin: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20",
  user: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

const LABELS: Partial<Record<BadgeStatus, string>> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  pending: "Ausstehend",
  admin: "Admin",
  user: "Benutzer",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: BadgeStatus | string;
  label?: string;
  className?: string;
}) {
  const key = status as BadgeStatus;
  const style = styles[key] || styles.pending;
  const text = label ?? LABELS[key] ?? String(status);

  return (
    <Badge variant="outline" className={cn("font-medium capitalize", style, className)}>
      {text}
    </Badge>
  );
}
