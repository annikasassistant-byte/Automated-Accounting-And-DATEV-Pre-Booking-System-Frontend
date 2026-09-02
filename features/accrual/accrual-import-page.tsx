"use client";

import { useState } from "react";
import { FileUp, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useImportJtlMutation,
  useImportMarketplaceMutation,
  useGetImportsQuery,
} from "@/services/accountingApi";
import type { AccrualImportKind } from "@/types/accrual";
import { formatDateTime } from "@/lib/format";

const META: Record<
  AccrualImportKind,
  { title: string; eyebrow: string; importSource: string }
> = {
  jtl: { title: "JTL-CSV Import", eyebrow: "JTL", importSource: "jtl" },
  amazon: { title: "Amazon Marktplatz-Import", eyebrow: "Amazon", importSource: "marketplace_amazon" },
  backmarket: {
    title: "Back Market Marktplatz-Import",
    eyebrow: "Back Market",
    importSource: "marketplace_backmarket",
  },
  refurbed: {
    title: "Refurbed Marktplatz-Import",
    eyebrow: "Refurbed",
    importSource: "marketplace_refurbed",
  },
};

export function AccrualImportPage({ kind }: { kind: AccrualImportKind }) {
  const meta = META[kind];
  const [importJtl, { isLoading: jtlLoading }] = useImportJtlMutation();
  const [importMarketplace, { isLoading: mpLoading }] = useImportMarketplaceMutation();
  const { data: history = [], refetch } = useGetImportsQuery({
    source: meta.importSource,
    limit: 20,
  });

  const [phase, setPhase] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<{
    createdCount?: number;
    duplicateCount?: number;
    eventCount?: number;
    errorCount?: number;
    status?: string;
    message?: string;
  } | null>(null);

  const isUploading = jtlLoading || mpLoading;

  const processFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Nur CSV-Dateien werden unterstützt");
      return;
    }
    setPhase("uploading");
    const formData = new FormData();
    formData.append("file", f);
    try {
      const payload =
        kind === "jtl"
          ? await importJtl(formData).unwrap()
          : await importMarketplace({ channel: kind, body: formData }).unwrap();
      setResult(payload);
      setPhase("done");
      void refetch();
      if (payload.status === "duplicate_file") {
        toast.warning(payload.message ?? "Datei bereits importiert");
      } else {
        toast.success(`${payload.createdCount ?? 0} Datensätze angelegt`);
      }
    } catch (err) {
      setPhase("error");
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Import fehlgeschlagen",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={meta.title} description={`${meta.eyebrow}-CSV hochladen und verarbeiten`} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4" />
            Datei hochladen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center hover:bg-muted/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) await processFile(f);
            }}
            onClick={() => document.getElementById(`accrual-file-${kind}`)?.click()}
          >
            {phase === "uploading" || isUploading ? (
              <div className="w-full max-w-sm space-y-3">
                <Progress value={66} />
                <p className="text-sm text-muted-foreground">Import läuft…</p>
              </div>
            ) : phase === "done" && result ? (
              <div className="space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="font-medium">Import abgeschlossen</p>
                <p className="text-sm text-muted-foreground">
                  {result.createdCount ?? 0} neu · {result.duplicateCount ?? 0} Duplikate ·{" "}
                  {result.eventCount ?? 0} Ereignisse
                </p>
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm">CSV hier ablegen oder klicken</p>
              </>
            )}
            <input
              id={`accrual-file-${kind}`}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await processFile(f);
              }}
            />
          </div>
          {phase === "done" && (
            <Button variant="outline" className="mt-4" onClick={() => setPhase("idle")}>
              Weitere Datei
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Letzte Importe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {history.length === 0 ? (
            <p className="text-muted-foreground">Noch keine Importe</p>
          ) : (
            history.map((batch) => (
              <div key={batch.id} className="flex justify-between border-b py-2 last:border-0">
                <span>{batch.fileName}</span>
                <span className="text-muted-foreground">{formatDateTime(batch.importedAt)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
