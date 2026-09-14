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

const MARKETPLACES: AccrualMarketplace[] = ["amazon", "backmarket", "refurbed", "kaufland"];

const MARKETPLACE_LABELS: Record<AccrualMarketplace, string> = {
  amazon: "Amazon",
  backmarket: "Back Market",
  refurbed: "refurbed",
  kaufland: "Kaufland",
};

const ACCOUNT_FIELDS = [
  { key: "revenueAccount", label: "Erlöse" },
  { key: "feeAccount", label: "Marktplatzgebühren" },
  { key: "refundAccount", label: "Erstattungen / Stornos" },
  { key: "clearingAccount", label: "Clearing / Verrechnung" },
  { key: "debtorAccount", label: "Forderungen / Debitor" },
  { key: "adjustmentAccount", label: "Anpassungen" },
  { key: "fxGainAccount", label: "FX-Gewinn (Platzhalter)" },
  { key: "fxLossAccount", label: "FX-Verlust (Platzhalter)" },
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
        description="Buchungskategorien (Erlöse, Gebühren, Clearing, Erstattungen) mit DATEV-Platzhaltern. Kontonummern später ohne Logikwechsel änderbar — Steuerberater-Abstimmung ist kein Blocker."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Standard-Erlöskonto (Fallback-Platzhalter)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="z. B. 81971"
            defaultValue={currentRevenue}
            onChange={(e) => setRevenueDefault(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">FX-Regel</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="ECB-Tageskurs; Wochenende/Feiertag = letzter ECB-Kurs; Marktplatz-EUR hat Vorrang"
            defaultValue={currentFx}
            onChange={(e) => setFxNote(e.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Standard: täglicher ECB-Referenzkurs. Fehlt ein Kurs (Wochenende/Feiertag), gilt der letzte
            veröffentlichte ECB-Tag. Liefert der Marktplatz den tatsächlichen EUR-Settlement-Betrag oder
            den verwendeten Kurs, hat dieser Vorrang für Settlement und Clearing. Originalwährung,
            Originalbetrag, Kurs, Kursdatum, EUR-Betrag und Quelle werden revisionssicher gespeichert.
          </p>
        </CardContent>
      </Card>

      {MARKETPLACES.map((mp) => (
        <Card key={mp}>
          <CardHeader>
            <CardTitle className="text-base">{MARKETPLACE_LABELS[mp]}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {ACCOUNT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs text-muted-foreground">{field.label}</label>
                <Input
                  defaultValue={(currentAccounts[mp] as Record<string, string> | undefined)?.[field.key] || ""}
                  onChange={(e) =>
                    setAccounts((prev) => ({
                      ...prev,
                      [mp]: { ...(prev[mp] || {}), [field.key]: e.target.value },
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
