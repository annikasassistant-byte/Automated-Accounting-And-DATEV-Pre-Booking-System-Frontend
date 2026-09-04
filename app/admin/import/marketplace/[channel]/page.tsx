"use client";

import { useParams } from "next/navigation";
import { AccrualImportPage } from "@/features/accrual/accrual-import-page";
import type { AccrualMarketplace } from "@/types/accrual";

const CHANNELS: AccrualMarketplace[] = ["amazon", "backmarket", "refurbed"];

export default function Page() {
  const params = useParams<{ channel: string }>();
  const channel = (params?.channel || "") as AccrualMarketplace;
  if (!CHANNELS.includes(channel)) {
    return <p className="text-destructive">Unbekannter Marktplatz-Kanal.</p>;
  }
  return <AccrualImportPage kind={channel} />;
}
