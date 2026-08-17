"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Save, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { formatCurrencyPrecise, formatDate, formatDateTime } from "@/lib/format";
import { accountLabel } from "@/store/accounting-store";
import { Badge } from "@/components/ui/badge";
import {
  useGetTransactionQuery,
  useGetAccountsQuery,
  useAssignTransactionMutation,
  useUpdateTransactionStatusMutation,
} from "@/services/accountingApi";
import { RuleWizardDialog } from "@/features/rules/rule-wizard-dialog";
import { useAuthStore } from "@/lib/auth-store";

interface TransactionDetailDrawerProps {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function TransactionDetailDrawer({
  transactionId,
  open,
  onOpenChange,
}: TransactionDetailDrawerProps) {
  const { data: tx, isLoading } = useGetTransactionQuery(transactionId!, {
    skip: !transactionId,
  });
  const { data: accounts = [] } = useGetAccountsQuery();
  const [assignTransaction] = useAssignTransactionMutation();
  const [updateStatus] = useUpdateTransactionStatusMutation();
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));

  const [konto, setKonto] = useState("");
  const [gegenkonto, setGegenkonto] = useState("");
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  useEffect(() => {
    if (!tx) return;
    setKonto(tx.booking?.konto ?? tx.expenseAccountId ?? "");
    setGegenkonto(tx.booking?.gegenkonto ?? tx.offsetAccountId ?? "");
  }, [tx]);

  const expenseAccounts = accounts.filter(
    (a) =>
      (a.type === "expense" || a.type === "revenue" || a.type === "other" || a.type === "asset") &&
      a.status === "active"
  );
  const offsetAccounts = accounts.filter(
    (a) =>
      (a.type === "asset" || a.type === "clearing" || a.type === "liability") &&
      a.status === "active"
  );

  const handleApprove = async () => {
    if (!tx) return;
    try {
      if (konto || gegenkonto) {
        await assignTransaction({
          id: tx.id,
          body: { konto: konto || undefined, gegenkonto: gegenkonto || undefined },
        }).unwrap();
      }
      await updateStatus({ id: tx.id, body: { status: "reviewed" } }).unwrap();
      toast.success("Transaktion freigegeben");
      onOpenChange(false);
    } catch {
      toast.error("Fehler beim Freigeben");
    }
  };

  const handleReject = async () => {
    if (!tx) return;
    try {
      await updateStatus({ id: tx.id, body: { status: "skipped" } }).unwrap();
      toast.success("Transaktion übersprungen");
      onOpenChange(false);
    } catch {
      toast.error("Fehler beim Überspringen");
    }
  };

  const handleSave = async () => {
    if (!tx) return;
    try {
      await assignTransaction({
        id: tx.id,
        body: { konto: konto || undefined, gegenkonto: gegenkonto || undefined },
      }).unwrap();
      toast.success("Änderungen gespeichert");
    } catch {
      toast.error("Fehler beim Speichern");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border/40">
          <SheetTitle>Transaktionsdetails</SheetTitle>
          <SheetDescription>
            {tx
              ? `${tx.transactionId} · ${formatDate(tx.date)}`
              : "Keine Transaktion ausgewählt"}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="p-4">
            <LoadingSkeleton variant="card" />
          </div>
        ) : !tx ? (
          <div className="p-4 text-sm text-muted-foreground">
            Bitte eine Transaktion auswählen.
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={tx.status} />
                  <StatusBadge status={tx.source} />
                  <StatusBadge status={tx.exportStatus} />
                  {(tx.systemMatched || tx.booking?.konto === "1361") && (
                    <Badge variant="secondary">System: Verrechnung 1361</Badge>
                  )}
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Datum</dt>
                    <dd className="font-medium">{formatDate(tx.date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Betrag</dt>
                    <dd className="font-medium tabular-nums">
                      {formatCurrencyPrecise(tx.amount, tx.currency)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Gegenpartei</dt>
                    <dd className="font-medium">{tx.counterparty}</dd>
                  </div>
                  {tx.source === "paypal" ? (
                    <>
                      {tx.article ? (
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">Artikelbezeichnung</dt>
                          <dd className="whitespace-pre-wrap break-words font-medium">
                            {tx.article}
                          </dd>
                        </div>
                      ) : null}
                      {tx.paypalSubject ? (
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">Betreff</dt>
                          <dd className="whitespace-pre-wrap break-words font-medium">
                            {tx.paypalSubject}
                          </dd>
                        </div>
                      ) : null}
                      {tx.paypalNote ? (
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">Hinweis</dt>
                          <dd className="whitespace-pre-wrap break-words font-medium">
                            {tx.paypalNote}
                          </dd>
                        </div>
                      ) : null}
                      {!tx.article && !tx.paypalSubject && !tx.paypalNote ? (
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">Verwendungszweck</dt>
                          <dd className="whitespace-pre-wrap break-words font-medium">
                            {tx.purpose || "—"}
                          </dd>
                        </div>
                      ) : null}
                      {(tx.paypalType || tx.paypal?.type) && (
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">PayPal-Typ</dt>
                          <dd>{tx.paypalType || tx.paypal?.type}</dd>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Verwendungszweck</dt>
                      <dd className="whitespace-pre-wrap break-words font-medium">
                        {tx.purpose || tx.article || "—"}
                      </dd>
                    </div>
                  )}
                  {tx.rawDescription &&
                    tx.rawDescription !== (tx.purpose || tx.description) && (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">Rohbeschreibung</dt>
                        <dd className="whitespace-pre-wrap break-words text-muted-foreground">
                          {tx.rawDescription}
                        </dd>
                      </div>
                    )}
                  <div>
                    <dt className="text-muted-foreground">Referenz</dt>
                    <dd>{tx.reference || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Transaktions-ID</dt>
                    <dd className="font-mono text-xs">{tx.transactionId}</dd>
                  </div>
                </dl>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Buchung</h3>
                {tx.booking && (
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    {tx.booking.bookingText && (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">Buchungstext</dt>
                        <dd className="font-medium">{tx.booking.bookingText}</dd>
                      </div>
                    )}
                    {tx.booking.buKey && (
                      <div>
                        <dt className="text-muted-foreground">BU-Schlüssel</dt>
                        <dd className="font-medium">{tx.booking.buKey}</dd>
                      </div>
                    )}
                    {tx.booking.sollHaben && (
                      <div>
                        <dt className="text-muted-foreground">Soll/Haben</dt>
                        <dd className="font-medium">{tx.booking.sollHaben}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {typeof tx.confidence === "number" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Konfidenz</span>
                      <span className="font-medium tabular-nums">
                        {tx.confidence.toFixed(0)} %
                      </span>
                    </div>
                    <Progress value={tx.confidence} />
                  </div>
                )}
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Konten</h3>
                <div className="space-y-2">
                  <Label>Aufwandskonto</Label>
                  <Select
                    value={konto || undefined}
                    onValueChange={(v) => setKonto(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Konto wählen">
                        {konto ? accountLabel(accounts, konto) : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {expenseAccounts.map((a) => (
                        <SelectItem key={a.number} value={a.number}>
                          {a.number} · {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gegenkonto</Label>
                  <Select
                    value={gegenkonto || undefined}
                    onValueChange={(v) => setGegenkonto(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Konto wählen">
                        {gegenkonto ? accountLabel(accounts, gegenkonto) : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {offsetAccounts.map((a) => (
                        <SelectItem key={a.number} value={a.number}>
                          {a.number} · {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Historie / Audit</h3>
                {tx.history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Einträge</p>
                ) : (
                  <ul className="space-y-2">
                    {tx.history.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{h.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(h.at)}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {h.actor}
                          {h.detail ? ` · ${h.detail}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <SheetFooter className="border-t border-border/40 sm:flex-row">
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => setRuleDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Regel daraus erstellen
                </Button>
              )}
              <Button variant="outline" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Speichern
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                <X className="mr-2 h-4 w-4" />
                Überspringen
              </Button>
              <Button onClick={handleApprove}>
                <Check className="mr-2 h-4 w-4" />
                Freigeben
              </Button>
            </SheetFooter>

            {tx && (
              <RuleWizardDialog
                open={ruleDialogOpen}
                onOpenChange={setRuleDialogOpen}
                initial={{
                  name: tx.counterparty || "",
                  keywords: [tx.counterparty, tx.purpose || tx.description].filter(Boolean) as string[],
                  expenseAccountId: tx.booking?.konto ?? tx.expenseAccountId ?? "",
                  offsetAccountId: tx.booking?.gegenkonto ?? tx.offsetAccountId ?? "",
                }}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
