"use client";

import { useParams } from "next/navigation";
import { AccrualImportPage } from "@/features/accrual/accrual-import-page";
import { EmptyState } from "@/components/shared/empty-state";
import type { AccrualMarketplace } from "@/types/accrual";

const VALID_CHANNELS = new Set<AccrualMarketplace>(["amazon", "backmarket", "refurbed"]);

function resolveChannel(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default function UserMarketplaceImportPage() {
  const params = useParams();
  const channel = resolveChannel(params?.channel as string | string[] | undefined);

  if (!channel || !VALID_CHANNELS.has(channel as AccrualMarketplace)) {
    return (
      <EmptyState
        title="Unbekannter Marktplatz"
        description={`Der Import-Kanal „${channel ?? "—"}“ wird nicht unterstützt. Erlaubt: Amazon, Back Market, Refurbed.`}
      />
    );
  }

  return <AccrualImportPage kind={channel as AccrualMarketplace} />;
}
