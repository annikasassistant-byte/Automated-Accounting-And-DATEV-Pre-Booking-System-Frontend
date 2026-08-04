"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  delay?: number;
}

export function ChartCard({
  title,
  description,
  children,
  className,
  action,
  delay = 0,
}: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("h-full", className)}
    >
      <Card
        className="h-full overflow-hidden rounded-2xl border-border/40 bg-card/80 shadow-none backdrop-blur-sm"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border/30 bg-muted/20 px-5 py-4">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1 text-[13px]">{description}</CardDescription>
            )}
          </div>
          {action}
        </CardHeader>
        <CardContent className="h-[min(320px,50vh)] min-h-[260px] p-4 pt-6 sm:p-6">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}
