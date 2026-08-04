"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandedLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center gap-6",
        className
      )}
      role="status"
      aria-label="Laden"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-1 rounded-full border-2 border-transparent border-t-primary border-r-primary/40"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <Layers className="h-4 w-4" />
        </div>
      </div>
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-foreground">Automated Accounting</p>
        <motion.div
          className="mx-auto h-1 w-24 overflow-hidden rounded-full bg-muted"
        >
          <motion.div
            className="h-full w-1/2 rounded-full bg-primary"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </div>
  );
}
