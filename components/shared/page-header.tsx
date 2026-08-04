"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
  hero?: boolean;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  className,
  hero = false,
}: PageHeaderProps) {
  if (hero) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/40 p-6 sm:p-8 md:p-10",
          "glass-panel-strong",
          className
        )}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-chart-2/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl font-semibold tracking-tight text-gradient-primary sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </motion.section>
    );
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        )}
      </div>
      {action}
    </motion.header>
  );
}
