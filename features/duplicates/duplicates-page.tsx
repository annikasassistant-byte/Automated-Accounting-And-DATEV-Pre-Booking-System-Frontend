"use client";

import { useMemo, useState } from "react";
import { GitMerge, Ban, Split, Info } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrencyPrecise, formatDate } from "@/lib/format";
import { TableScroll } from "@/components/shared/table-scroll";
import type { DuplicateItem, DuplicateTxnPreview } from "@/types/accounting";
import {
  useGetDuplicatesQuery,
  useResolveDuplicateMutation,
} from "@/services/accountingApi";

function DuplicateCard({
  item,
  busy,
  onMerge,
  onIgnore,
  onKeepBoth,
}: {
  item: DuplicateItem;
  busy: boolean;
  onMerge: () => void;
  onIgnore: () => void;
  onKeepBoth: () => void;
}) {
  const rows: DuplicateTxnPreview[] = item.transactions?.length
    ? item.transactions
    : item.transactionIds.map((id) => ({ id }));
  const first = rows[0];
  const rest = rows.slice(1);

  return (
    <Card className="border-border/40">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Duplikatgruppe</CardTitle>
            <StatusBadge status={String(item.kind)} />
            <span className="text-xs text-muted-foreground">
              {rows.length} Datensätze bereits gespeichert (Prüfung) — nicht „verhindert ohne Speichern“
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{item.reason || "Kein Grund hinterlegt"}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy}
            onClick={onIgnore}
          >
            <Ban className="mr-1.5 h-3.5 w-3.5" />
            Ignorieren
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy}
            onClick={onKeepBoth}
          >
            <Split className="mr-1.5 h-3.5 w-3.5" />
            Beide behalten
          </Button>
          <Button
            size="sm"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy || rows.length < 2}
            onClick={onMerge}
          >
            <GitMerge className="mr-1.5 h-3.5 w-3.5" />
            Zusammenführen
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border/40 p-3 text-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Original / erste</p>
            <p className="font-mono text-xs">{first?.id}</p>
            <p>{first?.counterpartyName || "—"}</p>
            <p className="text-muted-foreground">{first?.purpose || "—"}</p>
            <p className="tabular-nums">
              {first?.bookingDate ? formatDate(first.bookingDate) : "—"} ·{" "}
              {typeof first?.amountCents === "number"
                ? formatCurrencyPrecise(first.amountCents / 100)
                : "—"}
            </p>
            {first?.status && <StatusBadge status={first.status} />}
          </div>
          <div className="rounded-lg border border-border/40 p-3 text-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Weitere / eingehend</p>
            {rest.length === 0 ? (
              <p className="text-muted-foreground">Nur ein Eintrag in der Gruppe</p>
            ) : (
              rest.map((tx) => (
                <div key={tx.id} className="mb-2 border-b border-border/30 pb-2 last:border-0">
                  <p className="font-mono text-xs">{tx.id}</p>
                  <p>{tx.counterpartyName || "—"}</p>
                  <p className="text-muted-foreground">{tx.purpose || "—"}</p>
                  <p className="tabular-nums">
                    {tx.bookingDate ? formatDate(tx.bookingDate) : "—"} ·{" "}
                    {typeof tx.amountCents === "number"
                      ? formatCurrencyPrecise(tx.amountCents / 100)
                      : "—"}
                  </p>
                  {tx.status && <StatusBadge status={tx.status} />}
                </div>
              ))
            )}
          </div>
        </div>
        <TableScroll>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Gegenpartei</th>
                <th className="px-3 py-2">Betrag</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{tx.id.slice(-8)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {tx.bookingDate ? formatDate(tx.bookingDate) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div>{tx.counterpartyName || "—"}</div>
                    {tx.purpose && (
                      <div className="max-w-md truncate text-xs text-muted-foreground">
                        {tx.purpose}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {typeof tx.amountCents === "number"
                      ? formatCurrencyPrecise(tx.amountCents / 100)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {tx.status ? <StatusBadge status={tx.status} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </CardContent>
    </Card>
  );
}

export function DuplicatesPage() {
  const { data: duplicates = [], isLoading, isError, refetch } = useGetDuplicatesQuery();
  const [resolveDuplicate, { isLoading: resolving }] = useResolveDuplicateMutation();
  const [keyword, setKeyword] = useState("");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const filtered = useMemo(() => {
    const q = keyword.toLowerCase().trim();
    const min = amountMin ? Number(amountMin) * 100 : null;
    const max = amountMax ? Number(amountMax) * 100 : null;
    return duplicates.filter((item) => {
      const rows = item.transactions?.length
        ? item.transactions
        : item.transactionIds.map((id) => ({ id } as { id: string; purpose?: string; status?: string; amountCents?: number; source?: string; bookingDate?: string }));
      if (q) {
        const hay = [item.reason, ...rows.map((r) => `${r.purpose || ""} ${r.id}`)]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status !== "all") {
        if (!rows.some((r) => r.status === status)) return false;
      }
      if (source !== "all") {
        if (!rows.some((r) => (r as { source?: string }).source === source)) return false;
      }
      if (min != null || max != null) {
        const ok = rows.some((r) => {
          if (typeof r.amountCents !== "number") return false;
          if (min != null && Math.abs(r.amountCents) < min) return false;
          if (max != null && Math.abs(r.amountCents) > max) return false;
          return true;
        });
        if (!ok) return false;
      }
      return true;
    });
  }, [duplicates, keyword, source, status, amountMin, amountMax]);

  const run = async (id: string, action: "merge" | "ignore" | "keep_both") => {
    try {
      await resolveDuplicate({ id, action }).unwrap();
      const msg =
        action === "merge"
          ? "Zusammenführen: Folge-Buchungen als skipped — exportierte bleiben gesperrt"
          : action === "ignore"
            ? "Ignorieren: Gruppe geschlossen, Datensätze bleiben unverändert"
            : "Beide behalten: Gruppe geschlossen, keine Löschung (Auth/Release/Refund bleiben unterscheidbar)";
      toast.success(msg);
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Auflösung fehlgeschlagen",
      );
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  if (isError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Duplikate" eyebrow="Qualität" />
        <EmptyState
          title="Duplikate nicht ladbar"
          description="API /duplicates fehlgeschlagen."
          actionLabel="Erneut versuchen"
          onAction={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Duplikate"
        eyebrow="Qualität"
        description="Fingerprint-/Re-Upload-Gruppen. Datei-SHA kann Kopien verfehlen (DEF-SHA-COPY) — Fingerprint schützt Zeilen trotzdem."
      />

      <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-muted/20 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p>
            <strong className="text-foreground">Ignorieren:</strong> Gruppe schließen, Datensätze
            behalten. <strong className="text-foreground">Beide behalten:</strong> echte parallele
            Buchungen (z. B. Auth vs Payment). <strong className="text-foreground">Merge:</strong>{" "}
            Folgezeilen skipped; bereits exportierte Zeilen bleiben gesperrt.
          </p>
          <p>
            Große Gruppen (z. B. 653 Bank) = gespeicherte Fingerprint-Treffer zur Prüfung, nicht
            automatisch „653 neue Duplikate gebucht“.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label>Keyword</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Text…" />
          </div>
          <div className="space-y-1">
            <Label>Quelle</Label>
            <Select value={source} onValueChange={(v) => setSource(v || "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v || "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "open", "matched", "reviewed", "exported", "skipped"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "Alle" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Betrag min €</Label>
            <Input value={amountMin} onChange={(e) => setAmountMin(e.target.value)} type="number" />
          </div>
          <div className="space-y-1">
            <Label>Betrag max €</Label>
            <Input value={amountMax} onChange={(e) => setAmountMax(e.target.value)} type="number" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="Keine offenen Duplikate"
          description="Gruppen entstehen z. B. beim erneuten Upload derselben CSV (Fingerprint)."
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {filtered.length} von {duplicates.length} Gruppen
          </p>
          {filtered.map((item) => (
            <DuplicateCard
              key={item.id}
              item={item}
              busy={resolving}
              onMerge={() => void run(item.id, "merge")}
              onIgnore={() => void run(item.id, "ignore")}
              onKeepBoth={() => void run(item.id, "keep_both")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
