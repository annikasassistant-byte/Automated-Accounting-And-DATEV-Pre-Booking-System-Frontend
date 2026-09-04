"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { toast } from "sonner";
import {
  useGetClearingConfigQuery,
  useUpdateClearingConfigMutation,
} from "@/services/accountingApi";
import type { AccrualMarketplace } from "@/types/accrual";

const MARKETPLACES: AccrualMarketplace[] = ["amazon", "backmarket", "refurbed"];

const ACCOUNT_FIELDS = [
  "revenueAccount",
  "clearingAccount",
  "feeAccount",
  "refundAccount",
  "debtorAccount",
  "adjustmentAccount",
] as const;

export function ClearingSettingsPage() {
  const { data, isLoading } = useGetClearingConfigQuery();
  const [update, { isLoading: saving }] = useUpdateClearingConfigMutation();
  const [revenueDefault, setRevenueDefault] = useState("");
  const [fxNote, setFxNote] = useState("");
  const [accounts, setAccounts] = useState<Record<string, Record<string, string>>>({});

  if (isLoading) return <LoadingSkeleton variant="page" />;

  const currentRevenue = revenueDefault || data?.revenueAccountDefault || "";
  const currentFx = fxNote || data?.fxPolicyNote || "";
  const currentAccounts = data?.marketplaces || {};

  const save = async () => {
    try {
      const marketplaces: Record<string, Record<string, string | null | undefined>> = {};
      for (const mp of MARKETPLACES) {
        marketplaces[mp] = {
          ...(currentAccounts[mp] || {}),
          ...(accounts[mp] || {}),
        };
      }
      await update({
        revenueAccountDefault: currentRevenue || null,
        fxPolicyNote: currentFx,
        marketplaces,
      }).unwrap();
      toast.success("Clearing-Konten gespeichert");
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Speichern fehlgeschlagen",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marktplatz-Clearing"
        description="Separate Erlöskonten pro Marktplatz (Platzhalter bis Steuerberater-Final). Financial sales = Clearing."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standard-Erlöskonto (Fallback)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="z. B. 81973"
            defaultValue={currentRevenue}
            onChange={(e) => setRevenueDefault(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">FX-Policy (provisional / true-up)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Kursquelle/Datum — konfigurierbar, nicht hard-coded"
            defaultValue={currentFx}
            onChange={(e) => setFxNote(e.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            SEK→EUR provisional speichern; Settlement-True-up als separate FX-Differenz, Originalsale nicht
            überschreiben.
          </p>
        </CardContent>
      </Card>

      {MARKETPLACES.map((mp) => (
        <Card key={mp}>
          <CardHeader>
            <CardTitle className="text-base capitalize">{mp}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {ACCOUNT_FIELDS.map((field) => (
              <div key={field}>
                <label className="mb-1 block text-xs text-muted-foreground">{field}</label>
                <Input
                  defaultValue={(currentAccounts[mp] as Record<string, string> | undefined)?.[field] || ""}
                  onChange={(e) =>
                    setAccounts((prev) => ({
                      ...prev,
                      [mp]: { ...(prev[mp] || {}), [field]: e.target.value },
                    }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Button onClick={save} disabled={saving}>
        Speichern
      </Button>
    </div>
  );
}
