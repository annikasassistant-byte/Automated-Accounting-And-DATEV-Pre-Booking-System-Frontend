"use client";
import { AccrualImportPage } from "@/features/accrual/accrual-import-page";
import type { AccrualMarketplace } from "@/types/accrual";

export default function Page({ params }: { params: { channel: AccrualMarketplace } }) {
  return <AccrualImportPage kind={params.channel} />;
}
