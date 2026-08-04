"use client";

import { motion } from "framer-motion";

export function AnimatedValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {value}
    </motion.span>
  );
}
