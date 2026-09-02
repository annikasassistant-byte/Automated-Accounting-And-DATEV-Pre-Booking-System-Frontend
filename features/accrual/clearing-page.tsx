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

export function ClearingSettingsPage() {
  const { data, isLoading } = useGetClearingConfigQuery();
  const [update, { isLoading: saving }] = useUpdateClearingConfigMutation();
  const [revenueDefault, setRevenueDefault] = useState("");
  const [accounts, setAccounts] = useState<Record<string, Record<string, string>>>({});

  if (isLoading) return <LoadingSkeleton variant="page" />;

  const currentRevenue = revenueDefault || data?.revenueAccountDefault || "";
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
        description="Verrechnungskonten pro Marktplatz (nicht 1361 Bank↔PayPal)"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standard-Erlöskonto</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="z. B. 8400"
            defaultValue={currentRevenue}
            onChange={(e) => setRevenueDefault(e.target.value)}
          />
        </CardContent>
      </Card>

      {MARKETPLACES.map((mp) => (
        <Card key={mp}>
          <CardHeader>
            <CardTitle className="text-base capitalize">{mp}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {(["clearingAccount", "feeAccount", "refundAccount", "debtorAccount"] as const).map(
              (field) => (
                <div key={field}>
                  <label className="mb-1 block text-xs text-muted-foreground">{field}</label>
                  <Input
                    defaultValue={currentAccounts[mp]?.[field] || ""}
                    onChange={(e) =>
                      setAccounts((prev) => ({
                        ...prev,
                        [mp]: { ...(prev[mp] || {}), [field]: e.target.value },
                      }))
                    }
                  />
                </div>
              ),
            )}
          </CardContent>
        </Card>
      ))}

      <Button onClick={save} disabled={saving}>
        Speichern
      </Button>
    </div>
  );
}
