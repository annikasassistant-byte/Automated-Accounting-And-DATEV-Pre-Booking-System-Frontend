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
  useGetFeeVatPreviewQuery,
} from "@/services/accountingApi";
import type { AccrualMarketplace, FeeVatMarketplaceConfig } from "@/types/accrual";
import { DEFAULT_ACCRUAL_PERIOD } from "@/lib/accounting/accrual-period";
import { formatCurrencyPrecise } from "@/lib/format";

const MARKETPLACES: AccrualMarketplace[] = ["amazon", "backmarket", "refurbed", "kaufland"];

const MARKETPLACE_LABELS: Record<AccrualMarketplace, string> = {
  amazon: "Amazon",
  backmarket: "Back Market",
  refurbed: "refurbed",
  kaufland: "Kaufland",
};

const VAT_OPTIONS: Array<{ id: NonNullable<FeeVatMarketplaceConfig["treatment"]>; label: string }> = [
  { id: "reverse_charge_13b", label: "§13b Reverse Charge 19%" },
  { id: "input_vat_de", label: "German input VAT 19%" },
  { id: "none", label: "No automatic VAT" },
];

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
  const { data: vatPreview } = useGetFeeVatPreviewQuery({
    from: DEFAULT_ACCRUAL_PERIOD.from,
    to: DEFAULT_ACCRUAL_PERIOD.to,
  });
  const [revenueDefault, setRevenueDefault] = useState("");
  const [fxNote, setFxNote] = useState("");
  const [accounts, setAccounts] = useState<Record<string, Record<string, string>>>({});
  const [feeVat, setFeeVat] = useState<Record<string, string>>({});

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
      const feeVatPatch: Record<string, FeeVatMarketplaceConfig> = {};
      for (const mp of MARKETPLACES) {
        feeVatPatch[mp] = {
          ...(data?.feeVat?.[mp] || {}),
          treatment: (feeVat[mp] || data?.feeVat?.[mp]?.treatment ||
            (mp === "amazon" ? "input_vat_de" : mp === "kaufland" ? "none" : "reverse_charge_13b")) as FeeVatMarketplaceConfig["treatment"],
        };
      }
      await update({
        revenueAccountDefault: currentRevenue || null,
        fxPolicyNote: currentFx,
        marketplaces,
        feeVat: feeVatPatch,
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
        description="Placeholder DATEV accounts plus preconfigured fee VAT: §13b reverse charge for Back Market/Refurbed, German input VAT for Amazon. Invoice-level exceptions live on Geschäftsvorfälle."
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fee VAT (§13b / German input VAT)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Example: €10,000 reverse-charge fees at 19% → debit €1,900 input VAT §13b (1577) and credit
            €1,900 output VAT §13b (1787). Both amounts enter the VAT view even when they net to zero.
          </p>
          {vatPreview?.summaries?.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {vatPreview.summaries.map((s) => (
                <p key={s.marketplace}>
                  {s.marketplace}: {s.treatment} · fees {formatCurrencyPrecise(s.feeNetCents / 100)} · VAT{" "}
                  {formatCurrencyPrecise(s.vatCents / 100)} ({s.eventCount} invoices)
                </p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No FEE events in the default period yet.</p>
          )}
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
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Fee VAT treatment</label>
              <select
                className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
                defaultValue={
                  feeVat[mp] ||
                  data?.feeVat?.[mp]?.treatment ||
                  (mp === "amazon" ? "input_vat_de" : mp === "kaufland" ? "none" : "reverse_charge_13b")
                }
                onChange={(e) => setFeeVat((prev) => ({ ...prev, [mp]: e.target.value }))}
              >
                {VAT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button onClick={save} disabled={saving}>
        Speichern
      </Button>
    </div>
  );
}
