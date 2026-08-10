import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeStatus =
  | "active"
  | "inactive"
  | "pending"
  | "admin"
  | "user"
  | "new"
  | "imported"
  | "suggested"
  | "matched"
  | "open"
  | "conflict"
  | "reviewed"
  | "skipped"
  | "approved"
  | "rejected"
  | "exported"
  | "duplicate"
  | "not_exported"
  | "queued"
  | "failed"
  | "balanced"
  | "unbalanced"
  | "already_exported"
  | "possible_duplicate"
  | "unique"
  | "bank"
  | "paypal"
  | "completed"
  | "processing"
  | "draft"
  | "validated";

const styles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  inactive: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  admin: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20",
  user: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  new: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20",
  imported: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20",
  suggested: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  matched: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  open: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  conflict: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  reviewed: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/20",
  skipped: "bg-muted text-muted-foreground border-muted-foreground/20",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  exported: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20",
  duplicate: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  not_exported: "bg-muted text-muted-foreground",
  queued: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400",
  balanced: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  unbalanced: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  already_exported: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  possible_duplicate: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  unique: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  bank: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  paypal: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  processing: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  draft: "bg-muted text-muted-foreground",
  validated: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  fingerprint: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  possible: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  raw_row: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  duplicate_file: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
};

const LABELS: Record<string, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  pending: "Ausstehend",
  admin: "Admin",
  user: "Benutzer",
  new: "Neu",
  imported: "Importiert",
  suggested: "Vorschlag",
  matched: "Zugeordnet",
  open: "Offen",
  conflict: "Konflikt",
  reviewed: "Geprüft",
  skipped: "Übersprungen",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  exported: "Exportiert",
  duplicate: "Duplikat",
  not_exported: "Nicht exportiert",
  queued: "In Warteschlange",
  failed: "Fehlgeschlagen",
  balanced: "Ausgeglichen",
  unbalanced: "Differenz",
  already_exported: "Bereits exportiert",
  possible_duplicate: "Mögl. Duplikat",
  unique: "Eindeutig",
  bank: "Bank",
  paypal: "PayPal",
  completed: "Abgeschlossen",
  processing: "Verarbeitung",
  draft: "Entwurf",
  validated: "Validiert",
  fingerprint: "Fingerprint",
  possible: "Mögl. Duplikat",
  raw_row: "Rohzeile",
  duplicate_file: "Datei-Duplikat",
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
  const style = styles[status] || styles.pending;
  const text = label ?? LABELS[status] ?? String(status);

  return (
    <Badge variant="outline" className={cn("font-medium", style, className)}>
      {text}
    </Badge>
  );
}
