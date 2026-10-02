"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useGetAccrualEventsQuery,
  useBuildJournalDraftMutation,
  usePatchAccrualEventMutation,
  useBulkBuildAccrualJournalMutation,
  useBulkPostAccrualJournalMutation,
  useFxTrueUpEventMutation,
} from "@/services/accountingApi";
import { formatCurrencyPrecise, formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { ACCRUAL_PERIODS, DEFAULT_ACCRUAL_PERIOD, type AccrualPeriodId } from "@/lib/accounting/accrual-period";
import { JOURNAL_SKIP_REASON_LABELS, type JournalBulkSkipped } from "@/types/accrual";

const NON_BOOKABLE = new Set(["ORDER_CREATED", "CANCELLATION"]);

function needsFxTrueUp(ev: {
  metadata?: { fxReview?: boolean; fxTrueUp?: { posted?: boolean } } | null;
  fx?: { eurAmountCents?: number | null; originalCurrency?: string | null; exchangeRate?: number | null } | null;
}): boolean {
  if (ev.metadata?.fxTrueUp?.posted) return false;
  if (ev.metadata?.fxReview) return true;
  const cur = (ev.fx?.originalCurrency || "EUR").toUpperCase();
  if (cur !== "EUR" && (ev.fx?.eurAmountCents == null || ev.fx?.exchangeRate == null)) return true;
  return false;
}

export function AccrualEventsPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const [periodId, setPeriodId] = useState<AccrualPeriodId>(DEFAULT_ACCRUAL_PERIOD.id);
  const period = ACCRUAL_PERIODS.find((p) => p.id === periodId) ?? DEFAULT_ACCRUAL_PERIOD;
  const [page, setPage] = useState(1);
  const [marketplace, setMarketplace] = useState<string>("all");
  const [eventType, setEventType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [matchStatus, setMatchStatus] = useState<string>("all");
  const [q, setQ] = useState("");

  const query = useMemo(
    () => ({
      limit: 50,
      page,
      from: period.from,
      to: period.to,
      ...(marketplace !== "all" ? { marketplace } : {}),
      ...(eventType !== "all" ? { eventType } : {}),
      ...(status !== "all" ? { status } : {}),
      ...(matchStatus !== "all" ? { matchStatus } : {}),
      ...(q.trim() ? { q: q.trim() } : {}),
    }),
    [page, period, marketplace, eventType, status, matchStatus, q],
  );

  const { data, isLoading, refetch } = useGetAccrualEventsQuery(query);
  const [buildDraft, { isLoading: building }] = useBuildJournalDraftMutation();
  const [patchEvent] = usePatchAccrualEventMutation();
  const [bulkBuild, { isLoading: bulkBuilding }] = useBulkBuildAccrualJournalMutation();
  const [bulkPost, { isLoading: bulkPosting }] = useBulkPostAccrualJournalMutation();
  const [fxTrueUp, { isLoading: fxLoading }] = useFxTrueUpEventMutation();
  const [skipped, setSkipped] = useState<JournalBulkSkipped[]>([]);

  const events = data?.items ?? [];
  const total = data?.meta?.total ?? events.length;
  const totalPages = Math.max(1, Math.ceil(total / 50));

  const summary = useMemo(() => {
    const byType: Record<string, { count: number; cents: number }> = {};
    const orderIds = new Set<string>();
    let invoicePending = 0;
    let matched = 0;
    let posted = 0;
    for (const ev of events) {
      const key = ev.eventType || "OTHER";
      const cents = ev.fx?.eurAmountCents ?? 0;
      byType[key] = byType[key] || { count: 0, cents: 0 };
      byType[key].count += 1;
      byType[key].cents += cents;
      if (ev.marketplaceOrderId) orderIds.add(ev.marketplaceOrderId);
      if (ev.status === "invoice_pending") invoicePending += 1;
      if (ev.status === "matched") matched += 1;
      if (ev.status === "posted") posted += 1;
    }
    return { byType, uniqueOrders: orderIds.size, invoicePending, matched, posted, rows: events.length };
  }, [events]);

  const onBuild = async (eventId: string) => {
    try {
      await buildDraft({ eventId }).unwrap();
      toast.success("Journal-Entwurf erstellt");
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Entwurf fehlgeschlagen",
      );
    }
  };

  const onBulkBuild = async () => {
    try {
      const result = await bulkBuild({ from: period.from, to: period.to }).unwrap();
      setSkipped(result.skipped ?? []);
      toast.success(`${result.built} Entwürfe erzeugt · ${result.skipped?.length ?? 0} übersprungen`);
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Bulk-Entwürfe fehlgeschlagen",
      );
    }
  };

  const onBulkPost = async () => {
    try {
      const result = await bulkPost({ from: period.from, to: period.to }).unwrap();
      setSkipped(result.skipped ?? []);
      toast.success(`${result.posted} Entwürfe gebucht · ${result.skipped?.length ?? 0} übersprungen`);
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Bulk-Buchen fehlgeschlagen",
      );
    }
  };

  const onFx = async (eventId: string) => {
    try {
      const result = await fxTrueUp({ eventId }).unwrap();
      toast.success(result.message || "FX-Nachbuchung ausgeführt");
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "FX-Nachbuchung fehlgeschlagen",
      );
    }
  };

  if (isLoading && page === 1) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geschäftsvorfälle (Accrual)"
        description="Amazon-Status ist führend. Zugeordnet ≠ gebucht. ORDER_CREATED ≠ Umsatz; Financial = Clearing. Unique Orders ≠ Ereigniszeilen."
      />

      <div className="flex flex-wrap gap-2">
        {ACCRUAL_PERIODS.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={periodId === p.id ? "default" : "outline"}
            onClick={() => {
              setPeriodId(p.id);
              setPage(1);
            }}
          >
            {p.label}
          </Button>
        ))}
        {isAdmin && (
          <>
            <Button type="button" size="sm" variant="secondary" disabled={bulkBuilding} onClick={onBulkBuild}>
              Entwürfe erzeugen
            </Button>
            <Button type="button" size="sm" disabled={bulkPosting} onClick={onBulkPost}>
              Entwürfe buchen
            </Button>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label>Marktplatz</Label>
            <Select
              value={marketplace}
              onValueChange={(v) => {
                setMarketplace(v || "all");
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="amazon">Amazon</SelectItem>
                <SelectItem value="backmarket">Back Market</SelectItem>
                <SelectItem value="refurbed">Refurbed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Ereignistyp</Label>
            <Select
              value={eventType}
              onValueChange={(v) => {
                setEventType(v || "all");
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "SALE", "ORDER_CREATED", "REFUND", "FEE", "SETTLEMENT", "PAYOUT", "ADJUSTMENT", "CANCELLATION"].map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      {t === "all" ? "Alle" : t}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v || "all");
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "matched", "invoice_pending", "pending_match", "posted", "exception", "void"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "all" ? "Alle" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Match-Status</Label>
            <Select
              value={matchStatus}
              onValueChange={(v) => {
                setMatchStatus(v || "all");
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "MATCHED", "UNMATCHED", "AMBIGUOUS"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "all" ? "Alle" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Order / Rechnung</Label>
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Order-ID / Invoice…"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ereigniszeilen (Seite)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{summary.rows}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Unique Orders (Seite)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{summary.uniqueOrders}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rechnung ausstehend</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{summary.invoicePending}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Matched / Posted</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {summary.matched} / {summary.posted}
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        Invoice-Match und Payout-Match sind getrennt: ein Event kann Rechnung ausstehend und gleichzeitig
        ohne Payout-Zuordnung sein. SALE + Invoice + Settlement zählen als mehrere Zeilen, aber eine
        Order.
      </p>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Ereignisse · Seite {page}/{totalPages} · {total} gesamt
          </CardTitle>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Zurück
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Weiter / Mehr laden
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Accrual-Ereignisse für Filter/Zeitraum</p>
          ) : (
            events.map((ev) => (
              <div
                key={ev._id}
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {ev.eventType} · {ev.marketplace || ev.source}
                  </p>
                  <p className="text-muted-foreground">
                    {ev.marketplaceOrderId || ev.sourceRecordId} · {formatDateTime(ev.eventDate)}
                  </p>
                  {ev.matchStatus && (
                    <p className="text-xs text-muted-foreground">Match: {ev.matchStatus}</p>
                  )}
                  {ev.fx && (ev.fx.originalCurrency || ev.fx.eurAmountCents != null) && (
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      <p>
                        FX: Kurs {ev.fx.exchangeRate ?? "—"} · Quelle{" "}
                        {ev.fx.exchangeRateSource || "—"}
                        {ev.metadata?.fxReview ? " · Prüfung nötig" : ""}
                      </p>
                      <p>
                        {ev.fx.originalAmountCents != null
                          ? formatCurrencyPrecise(
                              (ev.fx.originalAmountCents || 0) / 100,
                              ev.fx.originalCurrency || "EUR",
                            )
                          : null}
                        {ev.fx.eurAmountCents != null
                          ? ` → ${formatCurrencyPrecise(ev.fx.eurAmountCents / 100)} EUR`
                          : " → EUR ausstehend"}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ev.status} />
                  {ev.metadata?.fxReview && <StatusBadge status="open" label="FX-Prüfung" />}
                  {isAdmin && ev.eventType === "FEE" && (
                    <select
                      className="h-9 rounded-md border bg-transparent px-2 text-xs"
                      defaultValue={ev.feeVatTreatment || "auto"}
                      onChange={async (e) => {
                        try {
                          await patchEvent({
                            id: ev._id,
                            feeVatTreatment: e.target.value as NonNullable<typeof ev.feeVatTreatment>,
                          }).unwrap();
                          toast.success("Fee-USt Ausnahme gespeichert");
                        } catch (err) {
                          toast.error(
                            (err as { data?: { message?: string } })?.data?.message ??
                              "USt-Override fehlgeschlagen",
                          );
                        }
                      }}
                    >
                      <option value="auto">USt auto</option>
                      <option value="reverse_charge_13b">§13b RC</option>
                      <option value="input_vat_de">DE Vorsteuer</option>
                      <option value="none">Keine USt</option>
                    </select>
                  )}
                  {isAdmin && needsFxTrueUp(ev) && (
                    <Button size="sm" variant="secondary" disabled={fxLoading} onClick={() => onFx(ev._id)}>
                      FX-Nachbuchung
                    </Button>
                  )}
                  {isAdmin && ev.status === "matched" && !NON_BOOKABLE.has(ev.eventType) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={building}
                      onClick={() => onBuild(ev._id)}
                    >
                      Journal-Entwurf
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {skipped.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Übersprungen ({skipped.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-2">Ereignis</th>
                    <th className="p-2">Grund</th>
                  </tr>
                </thead>
                <tbody>
                  {skipped.slice(0, 50).map((row) => (
                    <tr key={`${row.eventId}-${row.reason}`} className="border-t">
                      <td className="p-2 font-mono text-xs">{row.eventId}</td>
                      <td className="p-2">{JOURNAL_SKIP_REASON_LABELS[row.reason] || row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
