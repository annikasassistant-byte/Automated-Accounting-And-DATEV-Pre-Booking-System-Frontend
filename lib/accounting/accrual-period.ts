"use client";

export type AccrualPeriodId = "july" | "august" | "span";

export const ACCRUAL_PERIODS: ReadonlyArray<{
  id: AccrualPeriodId;
  from: string;
  to: string;
  label: string;
}> = [
  { id: "july", from: "2026-07-01", to: "2026-07-31", label: "Juli 2026" },
  { id: "august", from: "2026-08-01", to: "2026-08-31", label: "August 2026" },
  { id: "span", from: "2026-07-01", to: "2026-09-02", label: "Juli – 2. Sep 2026" },
];

export const DEFAULT_ACCRUAL_PERIOD = ACCRUAL_PERIODS[2];

export function periodById(id: string) {
  return ACCRUAL_PERIODS.find((p) => p.id === id) ?? DEFAULT_ACCRUAL_PERIOD;
}
