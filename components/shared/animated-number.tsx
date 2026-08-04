"use client";

export function AnimatedValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return <span className={className}>{value}</span>;
}
