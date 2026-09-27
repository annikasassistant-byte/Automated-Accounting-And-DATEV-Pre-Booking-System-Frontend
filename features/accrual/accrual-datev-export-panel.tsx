"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import {
  usePreviewAccrualDatevExportMutation,
  useValidateAccrualDatevExportMutation,
  useCreateAccrualDatevExportMutation,
  useGetAccrualDatevJobsQuery,
  useDownloadAccrualDatevExportMutation,
} from "@/services/accountingApi";
import type { AccrualDatevPreviewResult, AccrualDatevValidateResult } from "@/types/accrual";

type Step = "period" | "preview" | "validate" | "create";

export function AccrualDatevExportPanel({ from, to }: { from: string; to: string }) {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const [step, setStep] = useState<Step>("period");
  const [preview, setPreview] = useState<AccrualDatevPreviewResult | null>(null);
  const [validation, setValidation] = useState<AccrualDatevValidateResult | null>(null);

  const [doPreview, { isLoading: previewing }] = usePreviewAccrualDatevExportMutation();
  const [doValidate, { isLoading: validating }] = useValidateAccrualDatevExportMutation();
  const [doCreate, { isLoading: creating }] = useCreateAccrualDatevExportMutation();
  const [doDownload] = useDownloadAccrualDatevExportMutation();
  const { data: jobsData, refetch: refetchJobs } = useGetAccrualDatevJobsQuery({ limit: 15 });
  const jobs = jobsData?.items ?? [];

  const onPreview = async () => {
    try {
      const result = await doPreview({ from, to }).unwrap();
      setPreview(result);
      setValidation(null);
      setStep("preview");
      toast.success(`${result.rowCount} Accrual-DATEV-Zeilen (Vorschau)`);
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Vorschau fehlgeschlagen",
      );
    }
  };

  const onValidate = async () => {
    try {
      const result = await doValidate({ from, to }).unwrap();
      setValidation(result);
      setStep("validate");
      const passed = result.passed ?? result.valid ?? result.validation?.passed;
      if (passed === false || (result.errors?.length ?? result.validation?.errors?.length)) {
        toast.warning("Prüfung mit Hinweisen abgeschlossen");
      } else {
        toast.success("Prüfung bestanden");
      }
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Prüfung fehlgeschlagen",
      );
    }
  };

  const onCreate = async () => {
    if (!isAdmin) return;
    try {
      const job = await doCreate({ from, to }).unwrap();
      setStep("create");
      toast.success("Accrual-DATEV-Export erzeugt");
      void refetchJobs();
      if (job._id) {
        await doDownload({ jobId: job._id, fileName: job.fileName }).unwrap();
      }
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Export fehlgeschlagen",
      );
    }
  };

  const errors =
    validation?.errors ?? validation?.validation?.errors ?? preview?.validation?.errors ?? [];
  const warnings =
    validation?.warnings ?? validation?.validation?.warnings ?? preview?.validation?.warnings ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4" />
          Accrual-DATEV (Journal)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200">
          Dies ist <strong>Accrual-DATEV</strong> aus gebuchten Journalzeilen — nicht der Cash-DATEV
          (Bank/PayPal). Cash-Exporte und Transaktionssperren bleiben unberührt.
        </p>

        <p className="text-muted-foreground">
          Zeitraum {from} – {to} · Schritt:{" "}
          {step === "period"
            ? "Zeitraum"
            : step === "preview"
              ? "Vorschau"
              : step === "validate"
                ? "Prüfen"
                : "Erzeugen"}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={previewing} onClick={onPreview}>
            Vorschau
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={validating || !preview}
            onClick={onValidate}
          >
            Prüfen
          </Button>
          {isAdmin && (
            <Button
              type="button"
              size="sm"
              disabled={creating || !preview}
              onClick={onCreate}
            >
              Erzeugen
            </Button>
          )}
        </div>

        {preview && (
          <div className="space-y-2">
            <p>
              Vorschau: <strong>{preview.rowCount}</strong> Zeilen
              {preview.note ? ` — ${preview.note}` : ""}
            </p>
            {(preview.samples ?? []).slice(0, 8).map((row, i) => (
              <div key={i} className="flex justify-between gap-2 border-b py-1 text-xs text-muted-foreground">
                <span>
                  {String(row.Konto || row.accountNumber || "—")} ·{" "}
                  {String(row.SollHaben || row.sollHaben || "")} ·{" "}
                  {String(row.Buchungstext || row.bookingText || "")}
                </span>
              </div>
            ))}
          </div>
        )}

        {(errors.length > 0 || warnings.length > 0) && (
          <div className="space-y-1">
            {errors.map((e) => (
              <p key={e} className="text-destructive">
                Fehler: {e}
              </p>
            ))}
            {warnings.map((w) => (
              <p key={w} className="text-amber-700 dark:text-amber-400">
                Hinweis: {w}
              </p>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t pt-3">
          <p className="font-medium">Accrual-DATEV Jobs</p>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground">Noch keine Accrual-DATEV-Exporte</p>
          ) : (
            jobs.map((job) => (
              <div
                key={job._id}
                className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
              >
                <div>
                  <p className="font-medium">{job.fileName || job._id}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.rowCount ?? 0} Zeilen · {formatDateTime(job.createdAt || "")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.status && <StatusBadge status={job.status} />}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await doDownload({
                          jobId: job._id,
                          fileName: job.fileName,
                        }).unwrap();
                        toast.success("Download gestartet");
                      } catch (err) {
                        toast.error(
                          (err as { data?: { message?: string } })?.data?.message ??
                            "Download fehlgeschlagen",
                        );
                      }
                    }}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
