"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Save, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
import { formatCurrencyPrecise, formatDate, formatDateTime } from "@/lib/format";
import {
  accountLabel,
  ruleLabel,
  useAccountingStore,
} from "@/store/accounting-store";

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
  const transactions = useAccountingStore((s) => s.transactions);
  const accounts = useAccountingStore((s) => s.accounts);
  const rules = useAccountingStore((s) => s.rules);
  const updateTransaction = useAccountingStore((s) => s.updateTransaction);

  const tx = useMemo(
    () => transactions.find((t) => t.id === transactionId) ?? null,
    [transactions, transactionId]
  );

  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [offsetAccountId, setOffsetAccountId] = useState("");
  const [keywordsText, setKeywordsText] = useState("");

  useEffect(() => {
    if (!tx) return;
    setExpenseAccountId(tx.expenseAccountId ?? "");
    setOffsetAccountId(tx.offsetAccountId ?? "");
    setKeywordsText((tx.suggestedKeywords ?? []).join(", "));
  }, [tx]);

  const expenseAccounts = accounts.filter(
    (a) => a.type === "expense" && a.status === "active"
  );
  const offsetAccounts = accounts.filter(
    (a) => a.type === "offset" && a.status === "active"
  );

  const handleApprove = () => {
    if (!tx) return;
    updateTransaction(tx.id, {
      status: "approved",
      expenseAccountId: expenseAccountId || tx.expenseAccountId,
      offsetAccountId: offsetAccountId || tx.offsetAccountId,
      suggestedKeywords: keywordsText
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    });
    toast.success("Transaktion freigegeben");
    onOpenChange(false);
  };

  const handleReject = () => {
    if (!tx) return;
    updateTransaction(tx.id, { status: "rejected" });
    toast.success("Transaktion abgelehnt");
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!tx) return;
    updateTransaction(tx.id, {
      expenseAccountId: expenseAccountId || null,
      offsetAccountId: offsetAccountId || null,
      suggestedKeywords: keywordsText
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    });
    toast.success("Änderungen gespeichert");
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

        {!tx ? (
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
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Beschreibung</dt>
                    <dd>{tx.description || "—"}</dd>
                  </div>
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
                <h3 className="text-sm font-semibold">Schlüsselwörter</h3>
                <div className="space-y-2">
                  <Label htmlFor="tx-keywords">Vorgeschlagene Keywords</Label>
                  <Input
                    id="tx-keywords"
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    placeholder="z. B. DHL, Versand"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Regelzuordnung</h3>
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Zugeordnete Regel</dt>
                    <dd className="font-medium">
                      {ruleLabel(rules, tx.matchedRuleId)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Vorgeschlagene Regel</dt>
                    <dd className="font-medium">
                      {ruleLabel(rules, tx.suggestedRuleId)}
                    </dd>
                  </div>
                </dl>
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
                    value={expenseAccountId || undefined}
                    onValueChange={(v) => setExpenseAccountId(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Konto wählen">
                        {expenseAccountId
                          ? accountLabel(accounts, expenseAccountId)
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {expenseAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.number} · {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gegenkonto</Label>
                  <Select
                    value={offsetAccountId || undefined}
                    onValueChange={(v) => setOffsetAccountId(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Konto wählen">
                        {offsetAccountId
                          ? accountLabel(accounts, offsetAccountId)
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {offsetAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
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
              <Button variant="outline" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Speichern
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                <X className="mr-2 h-4 w-4" />
                Ablehnen
              </Button>
              <Button onClick={handleApprove}>
                <Check className="mr-2 h-4 w-4" />
                Freigeben
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
