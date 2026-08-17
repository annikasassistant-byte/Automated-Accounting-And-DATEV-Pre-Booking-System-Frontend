import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFoundPage() {
  return (
    <div className="mesh-background flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="glass-panel-strong relative flex h-24 w-24 items-center justify-center rounded-3xl">
        <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-xl" />
        <FileQuestion className="relative h-11 w-11 text-primary" strokeWidth={1.5} />
      </div>
      <div className="max-w-md space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Seite nicht gefunden</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Diese Adresse gibt es nicht. Prüfen Sie den Link oder kehren Sie zur Anmeldung
          beziehungsweise zum Dashboard zurück.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/login" className={cn(buttonVariants(), "min-h-11 rounded-xl px-6")}>
          Zur Anmeldung
        </Link>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11 rounded-xl px-6")}
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
