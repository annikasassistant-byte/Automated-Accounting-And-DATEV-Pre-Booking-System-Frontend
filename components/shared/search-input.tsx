"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function SearchInput({
  value,
  onChange,
  placeholder = "Suchen…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("relative flex-1", className)}
      animate={value ? { scale: 1.01 } : { scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border-border/50 bg-background/80 pl-10 shadow-sm transition-shadow focus-visible:shadow-md"
      />
    </motion.div>
  );
}
