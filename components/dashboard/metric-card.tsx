"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Sparkline } from "@/components/dashboard/sparkline";
import { AnimatedValue } from "@/components/shared/animated-number";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: number;
  sparkline?: readonly number[];
  className?: string;
  delay?: number;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  sparkline,
  className,
  delay = 0,
}: MetricCardProps) {
  const trendUp = trend === undefined || trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 p-5 backdrop-blur-sm transition-shadow duration-300",
        className
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-chart-3/[0.03] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium tracking-wide text-muted-foreground">{title}</p>
          <AnimatedValue
            value={value}
            className="mt-2 block text-[1.65rem] font-semibold leading-none tracking-tight tabular-financial text-foreground"
          />
          {subtitle && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-2 border-t border-border/40 pt-3">
        {trend !== undefined ? (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trendUp
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {trendUp ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend)}%
            <span className="font-normal text-muted-foreground">vs prior</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Live portfolio</span>
        )}
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} positive={trendUp} />
        )}
      </div>
    </motion.div>
  );
}
