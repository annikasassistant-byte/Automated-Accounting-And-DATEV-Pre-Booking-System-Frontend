"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetTaxCodesQuery, useUpsertTaxCodeMutation } from "@/services/accountingApi";
import { useAuthStore } from "@/lib/auth-store";

export function TaxCodesPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const { data = [], isLoading, isError, refetch } = useGetTaxCodesQuery();
  const [upsert, { isLoading: saving }] = useUpsertTaxCodeMutation();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [buKey, setBuKey] = useState("");
  const [vatRatePercent, setVatRatePercent] = useState("");

  const onSave = async () => {
    if (!code.trim() || !label.trim()) {
      toast.error("Code und Bezeichnung erforderlich");
      return;
    }
    try {
      await upsert({
        code: code.trim(),
        label: label.trim(),
        buKey: buKey.trim() || undefined,
        vatRatePercent: vatRatePercent ? Number(vatRatePercent) : undefined,
        enabled: true,
      }).unwrap();
      toast.success("Steuerschlüssel gespeichert");
      setCode("");
      setLabel("");
      setBuKey("");
      setVatRatePercent("");
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Speichern fehlgeschlagen",
      );
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;
  if (isError) {
    return <p className="text-destructive">Steuerschlüssel konnten nicht geladen werden.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Steuerschlüssel (Accrual)"
        description="Tax codes für Accrual-Buchungen. Admin kann anlegen/aktualisieren (F-046)."
      />

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anlegen / Aktualisieren</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="z. B. 19" />
            </div>
            <div className="space-y-1">
              <Label>Bezeichnung</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>BU</Label>
              <Input value={buKey} onChange={(e) => setBuKey(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>USt %</Label>
              <Input
                type="number"
                value={vatRatePercent}
                onChange={(e) => setVatRatePercent(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button disabled={saving} onClick={() => void onSave()}>
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Steuerschlüssel</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-2">Code</th>
                    <th className="p-2">Bezeichnung</th>
                    <th className="p-2">BU</th>
                    <th className="p-2">USt %</th>
                    <th className="p-2">Klassifikation</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row._id} className="border-t">
                      <td className="p-2 font-mono text-xs">{row.code}</td>
                      <td className="p-2">{row.label}</td>
                      <td className="p-2">{row.buKey || "—"}</td>
                      <td className="p-2">
                        {row.vatRatePercent != null ? `${row.vatRatePercent}%` : "—"}
                      </td>
                      <td className="p-2 text-muted-foreground">{row.classification || "—"}</td>
                      <td className="p-2">
                        <StatusBadge
                          status={row.enabled === false ? "inactive" : "active"}
                          label={row.enabled === false ? "Inaktiv" : "Aktiv"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
