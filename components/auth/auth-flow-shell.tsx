import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import Link from "next/link";

const steps = [
  { id: 1, label: "E-Mail" },
  { id: 2, label: "OTP prüfen" },
  { id: 3, label: "Neues Passwort" },
] as const;

export function AuthFlowShell({
  step,
  title,
  description,
  children,
}: {
  step: 1 | 2 | 3;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mesh-background flex min-h-screen items-center justify-center p-4">
      <div className="glass-panel-strong w-full max-w-md rounded-2xl p-8 shadow-xl">
        <Link href="/login" className="mb-8 flex items-center gap-2 text-primary">
          <Layers className="h-5 w-5" />
          <span className="text-sm font-semibold">Automated Accounting</span>
        </Link>

        <nav aria-label="Fortschritt Passwort-Zurücksetzung" className="mb-8">
          <ol className="flex items-center justify-between gap-2">
            {steps.map((s, i) => {
              const done = s.id < step;
              const active = s.id === step;
              return (
                <li key={s.id} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-center">
                    {i > 0 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 rounded-full",
                          done || active ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        done && "bg-primary text-primary-foreground",
                        active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                        !done && !active && "bg-muted text-muted-foreground"
                      )}
                    >
                      {s.id}
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 rounded-full",
                          done ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium uppercase tracking-wide",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
