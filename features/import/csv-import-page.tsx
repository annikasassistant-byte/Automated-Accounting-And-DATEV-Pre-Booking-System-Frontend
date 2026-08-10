"use client";

import { useState } from "react";
import { AlertTriangle, FileUp, Upload, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrencyPrecise, formatDateTime } from "@/lib/format";
import type { TransactionSource } from "@/types/accounting";
import {
  useImportBankMutation,
  useImportPaypalMutation,
  useGetImportsQuery,
  useReprocessImportMutation,
} from "@/services/accountingApi";

type Phase = "idle" | "uploading" | "done" | "error";

export function CsvImportPage({ source }: { source: TransactionSource }) {
  const [importBank, { isLoading: bankLoading }] = useImportBankMutation();
  const [importPaypal, { isLoading: paypalLoading }] = useImportPaypalMutation();
  const [reprocess, { isLoading: reprocessing }] = useReprocessImportMutation();
  const {
    data: history = [],
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useGetImportsQuery({ source, limit: 50 });

  const isUploading = bankLoading || paypalLoading;

  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    rowCount: number;
    successCount: number;
    errorCount: number;
    status?: string;
    balanceCheck?: {
      expectedGuthaben: number;
      calculatedGuthaben: number;
      matched: boolean;
      note?: string;
    } | null;
    message?: string;
  } | null>(null);

  const title = source === "bank" ? "Bank-CSV Import" : "PayPal-CSV Import";
  const eyebrow = source === "bank" ? "Bank" : "PayPal";

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setResult(null);
  };

  const processFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Nur CSV-Dateien werden unterstützt");
      return;
    }
    setFile(f);
    setPhase("uploading");

    const formData = new FormData();
    formData.append("file", f);

    try {
      const mutation = source === "bank" ? importBank : importPaypal;
      const batch = await mutation(formData).unwrap();
      setResult({
        rowCount: batch.rowCount,
        successCount: batch.successCount,
        errorCount: batch.errorCount,
        status: batch.status,
        balanceCheck: batch.balanceCheck,
        message: batch.message,
      });
      setPhase("done");
      void refetchHistory();
      if (batch.status === "duplicate_file") {
        toast.warning(batch.message ?? "Datei wurde bereits importiert (Duplikat).");
      } else {
        toast.success(`${batch.successCount || batch.rowCount} Zeilen verarbeitet`);
      }
    } catch (err) {
      setPhase("error");
      const msg =
        (err as { data?: { message?: string } })?.data?.message ?? "Import fehlgeschlagen";
      toast.error(msg);
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) await processFile(f);
  };

  const handleReprocess = async (id: string) => {
    try {
      const res = await reprocess(id).unwrap();
      toast.success(
        `Neu verarbeitet: ${res.matchedCount} matched, ${res.openCount} offen, ${res.conflictCount} Konflikte`,
      );
      void refetchHistory();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Neuverarbeitung fehlgeschlagen",
      );
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        eyebrow={eyebrow}
        description="CSV hochladen — der Server validiert, importiert und wendet Regeln an."
        action={
          phase !== "idle" ? (
            <Button variant="outline" onClick={reset}>
              Neuer Import
            </Button>
          ) : undefined
        }
      />

      {(phase === "idle" || phase === "error") && (
        <Card
          className="border-dashed border-border/60"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">CSV hierher ziehen</p>
              <p className="text-sm text-muted-foreground">
                oder Datei auswählen · Upload wird serverseitig verarbeitet
              </p>
            </div>
            <label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void processFile(f);
                }}
              />
              <Button render={<span />} className="cursor-pointer">
                <FileUp className="mr-2 h-4 w-4" />
                Datei durchsuchen
              </Button>
            </label>
            {phase === "error" && (
              <EmptyState
                title="Import fehlgeschlagen"
                description="Prüfen Sie das CSV-Format und versuchen Sie es erneut."
              />
            )}
          </CardContent>
        </Card>
      )}

      {phase === "uploading" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload läuft…</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={isUploading ? 50 : 100} />
            <p className="text-sm text-muted-foreground">{file?.name}</p>
          </CardContent>
        </Card>
      )}

      {phase === "done" && result && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            {result.status === "duplicate_file" ? (
              <AlertTriangle className="h-12 w-12 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            )}
            <div className="space-y-1">
              <p className="text-xl font-semibold">
                {result.status === "duplicate_file" ? "Duplikat erkannt" : "Import erfolgreich"}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.status === "duplicate_file"
                  ? (result.message ?? "Diese Datei wurde bereits importiert.")
                  : (
                      <>
                        {result.successCount} Transaktionen aus {file?.name} übernommen.
                        {result.errorCount > 0 && ` ${result.errorCount} Fehler.`}
                      </>
                    )}
              </p>
            </div>
            {result.status !== "duplicate_file" && (
              <div className="flex items-center gap-3">
                <StatusBadge status={source} />
                <span className="text-sm text-muted-foreground tabular-nums">
                  {result.rowCount} Zeilen verarbeitet
                </span>
              </div>
            )}
            {result.balanceCheck && (
              <div
                className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  result.balanceCheck.matched
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                }`}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    Saldoabgleich: {result.balanceCheck.matched ? "Stimmt überein" : "Abweichung"}
                  </p>
                  <p>
                    Erwartet: {result.balanceCheck.expectedGuthaben.toFixed(2)} € · Berechnet:{" "}
                    {result.balanceCheck.calculatedGuthaben.toFixed(2)} €
                  </p>
                  {result.balanceCheck.note && <p>{result.balanceCheck.note}</p>}
                </div>
              </div>
            )}
            <Button onClick={reset}>Weiteren Import</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Import-Historie</CardTitle>
            <p className="text-sm text-muted-foreground">
              Letzte {source === "bank" ? "Bank" : "PayPal"}-Imports aus MongoDB
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refetchHistory()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Aktualisieren
          </Button>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <LoadingSkeleton />
          ) : historyError ? (
            <EmptyState
              title="Historie nicht ladbar"
              description="API /imports konnte nicht gelesen werden."
            />
          ) : history.length === 0 ? (
            <EmptyState
              title="Noch keine Imports"
              description="Laden Sie eine CSV-Datei hoch, um die Historie zu füllen."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Datei</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Zeilen</th>
                    <th className="px-3 py-2 font-medium">Matched / Offen / Konflikt</th>
                    <th className="px-3 py-2 font-medium">Guthaben</th>
                    <th className="px-3 py-2 font-medium">Datum</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {history.map((batch) => (
                    <tr key={batch.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{batch.fileName || "—"}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {batch.fileHash?.slice(0, 12)}…
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="px-3 py-2 tabular-nums">{batch.rowCount}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {batch.matchedCount ?? 0} / {batch.openCount ?? 0} /{" "}
                        {batch.conflictCount ?? 0}
                      </td>
                      <td className="px-3 py-2">
                        {batch.balanceCheck ? (
                          <span
                            className={
                              batch.balanceCheck.matched
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-amber-700 dark:text-amber-400"
                            }
                          >
                            {batch.balanceCheck.matched ? "OK" : "Diff"}{" "}
                            {formatCurrencyPrecise(batch.balanceCheck.expectedGuthaben ?? 0)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {batch.importedAt ? formatDateTime(batch.importedAt) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {batch.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={reprocessing}
                            onClick={() => void handleReprocess(batch.id)}
                          >
                            Neu anwenden
                          </Button>
                        )}
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
