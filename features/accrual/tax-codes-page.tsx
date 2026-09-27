"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { useGetTaxCodesQuery } from "@/services/accountingApi";

export function TaxCodesPage() {
  const { data = [], isLoading, isError } = useGetTaxCodesQuery();

  if (isLoading) return <LoadingSkeleton variant="page" />;
  if (isError) {
    return <p className="text-destructive">Steuerschlüssel konnten nicht geladen werden.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Steuerschlüssel (Accrual)"
        description="Tax codes für Accrual-Buchungen — nur Anzeige. Änderungen über die API."
      />

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
