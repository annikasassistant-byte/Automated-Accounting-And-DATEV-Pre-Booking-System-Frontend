"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  className,
  positive = true,
}: {
  data: readonly number[];
  className?: string;
  positive?: boolean;
}) {
  const id = useId();
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 72;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke = positive ? "#10b981" : "#ef4444";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("h-7 w-[4.5rem] shrink-0 opacity-90", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon fill={`url(#${id})`} points={`0,${h} ${points} ${w},${h}`} />
    </svg>
  );
}
