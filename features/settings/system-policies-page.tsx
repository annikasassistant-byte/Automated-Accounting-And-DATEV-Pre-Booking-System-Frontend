"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/lib/auth-store";
import type { SystemPolicyConfig, SystemPolicyEnabled } from "@/types/accounting";
import {
  useGetSystemPoliciesQuery,
  useUpdateSystemPoliciesMutation,
  useResetSystemPoliciesMutation,
} from "@/services/accountingApi";

function listToText(items: string[] | undefined): string {
  return (items || []).join("\n");
}

function textToList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const ENABLE_LABELS: { key: keyof SystemPolicyEnabled; label: string; hint: string }[] = [
  { key: "s1ExcludePaypalTypes", label: "S1 PayPal-Typen ausschließen", hint: "Hold/ACH-Typen als skipped markieren" },
  { key: "s2GuthabenIntegrity", label: "S2 Guthaben-Integrität", hint: "Ausschlüsse bei Differenz als balance_only behalten" },
  { key: "s3EurOnly", label: "S3 Nur EUR", hint: "Nicht-EUR ohne EUR-Betrag überspringen (Parser)" },
  { key: "s5BankPaypalClearing", label: "S5/S6 Bank↔PayPal Clearing", hint: "Automatisch auf Verrechnungskonto buchen" },
  { key: "s9MarketplacePark", label: "S9 Marketplace parkieren", hint: "Amazon/eBay etc. bleiben offen" },
  { key: "s10CommercialVatPark", label: "S10 USt/Lieferant parkieren", hint: "Gewerbliche Hinweise → Open" },
  { key: "s11OwnerRelatedPark", label: "S11 Eigentümer parkieren", hint: "Privatentnahme/Inhaber → Open" },
  { key: "s12ForbiddenCollectives", label: "S12 Sammelkonten verbieten", hint: "LexOffice 10001/70002 blockieren" },
  { key: "s15Inventory", label: "S15 Inventar-Gegenkonto", hint: "Gegenkonto bei Inventarkonto anpassen" },
];

export function SystemPoliciesPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const { data, isLoading } = useGetSystemPoliciesQuery();
  const [updatePolicies, { isLoading: saving }] = useUpdateSystemPoliciesMutation();
  const [resetPolicies, { isLoading: resetting }] = useResetSystemPoliciesMutation();

  const [form, setForm] = useState<SystemPolicyConfig | null>(null);

  useEffect(() => {
    if (data) setForm(structuredClone(data));
  }, [data]);

  if (isLoading || !form) return <LoadingSkeleton />;

  const setEnabled = (key: keyof SystemPolicyEnabled, value: boolean) => {
    setForm((prev) =>
      prev ? { ...prev, enabled: { ...prev.enabled, [key]: value } } : prev,
    );
  };

  const setAccount = (key: keyof SystemPolicyConfig["accounts"], value: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            accounts: {
              ...prev.accounts,
              [key]: key === "forbiddenCollectives" ? prev.accounts.forbiddenCollectives : value,
            },
          }
        : prev,
    );
  };

  const save = async () => {
    if (!isAdmin) {
      toast.error("Nur Administratoren können Systemrichtlinien ändern");
      return;
    }
    try {
      await updatePolicies(form).unwrap();
      toast.success("Systemrichtlinien gespeichert");
    } catch (e: unknown) {
      const msg =
        (e as { data?: { message?: string } })?.data?.message ||
        "Fehler beim Speichern der Systemrichtlinien";
      toast.error(msg);
    }
  };

  const reset = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Systemrichtlinien auf Werkseinstellungen zurücksetzen?")) return;
    try {
      const restored = await resetPolicies().unwrap();
      setForm(structuredClone(restored));
      toast.success("Auf Standard zurückgesetzt");
    } catch {
      toast.error("Zurücksetzen fehlgeschlagen");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Systemrichtlinien"
        description="Admin-konfigurierbare Buchungsrichtlinien (S1–S15). Änderungen gelten für neue Imports und Regel-Anwendung."
        actions={
          isAdmin ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} disabled={resetting}>
                <RotateCcw className="size-4" />
                Standard
              </Button>
              <Button onClick={save} disabled={saving}>
                <Save className="size-4" />
                Speichern
              </Button>
            </div>
          ) : undefined
        }
      />

      {!isAdmin && (
        <p className="text-sm text-muted-foreground">
          Nur Leserecht — Änderungen sind Administratoren vorbehalten.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4" />
            Richtlinien aktivieren
          </CardTitle>
          <CardDescription>Einzelne Systemregeln ein- oder ausschalten</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {ENABLE_LABELS.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.hint}</div>
              </div>
              <Switch
                checked={Boolean(form.enabled[item.key])}
                disabled={!isAdmin}
                onCheckedChange={(v) => setEnabled(item.key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Systemkonten</CardTitle>
          <CardDescription>Bank, PayPal, Clearing, Inventar und verbotene Sammelkonten</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["bank", "Bankkonto"],
              ["paypal", "PayPal-Konto"],
              ["clearing", "Verrechnung (Clearing)"],
              ["privateInventory", "Privat Inventar"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`acc-${key}`}>{label}</Label>
              <Input
                id={`acc-${key}`}
                value={form.accounts[key]}
                disabled={!isAdmin}
                onChange={(e) => setAccount(key, e.target.value)}
              />
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="forbidden">Verbotene Sammelkonten (eine pro Zeile)</Label>
            <textarea
              id="forbidden"
              className="min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              disabled={!isAdmin}
              value={listToText(form.accounts.forbiddenCollectives)}
              onChange={(e) =>
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        accounts: {
                          ...prev.accounts,
                          forbiddenCollectives: textToList(e.target.value),
                        },
                      }
                    : prev,
                )
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="clearingText">Clearing-Buchungstext</Label>
            <Input
              id="clearingText"
              value={form.clearingBookingText}
              disabled={!isAdmin}
              onChange={(e) =>
                setForm((prev) =>
                  prev ? { ...prev, clearingBookingText: e.target.value } : prev,
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {(
        [
          ["paypalExcludeTypes", "S1 PayPal-Ausschlusstypen", "Exakter Typname, eine Zeile pro Typ"],
          ["marketplacePatterns", "S9 Marketplace-Muster", "Regex (ohne Flags), eine Zeile"],
          ["bankPaypalCounterpartyPatterns", "S5 Gegenpartei-Muster (Bank)", "Regex für PayPal-Gegenpartei"],
          ["bankPaypalPurposePatterns", "S5 Verwendungszweck-Muster", "Regex für Zweck/Typ"],
          ["paypalBankTransferTypePatterns", "S5 PayPal→Bank Typ-Muster", "Regex auf PayPal-Typ"],
          ["ownerRelatedPatterns", "S11 Eigentümer-Muster", "Regex"],
          ["commercialVatHints", "S10 USt/Lieferanten-Hinweise", "Regex"],
          ["inventoryKeywords", "S15 Inventar-Schlüsselwörter", "Einfache Keywords (any_of)"],
        ] as const
      ).map(([key, title, hint]) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{hint}</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="min-h-32 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm"
              disabled={!isAdmin}
              value={listToText(form[key])}
              onChange={(e) =>
                setForm((prev) =>
                  prev ? { ...prev, [key]: textToList(e.target.value) } : prev,
                )
              }
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
