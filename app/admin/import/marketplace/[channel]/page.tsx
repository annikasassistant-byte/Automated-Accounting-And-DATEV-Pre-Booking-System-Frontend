"use client";

import { useParams } from "next/navigation";
import { AccrualImportPage } from "@/features/accrual/accrual-import-page";
import type { AccrualCsvChannel } from "@/types/accrual";

const CHANNELS: AccrualCsvChannel[] = ["amazon", "backmarket", "refurbed"];

export default function Page() {
  const params = useParams<{ channel: string }>();
  const channel = (params?.channel || "") as AccrualCsvChannel;
  if (!CHANNELS.includes(channel)) {
    return <p className="text-destructive">Unbekannter Marktplatz-Kanal.</p>;
  }
  return <AccrualImportPage kind={channel} />;
}
