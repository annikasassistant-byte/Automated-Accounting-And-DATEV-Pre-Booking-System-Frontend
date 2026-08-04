"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyPrecise, formatDate } from "@/lib/format";
import type { AccountingRule, MatchMode } from "@/types/accounting";
import { accountLabel, useAccountingStore } from "@/store/accounting-store";

const MATCH_MODE_LABELS: Record<MatchMode, string> = {
  contains: "Enthält",
  starts_with: "Beginnt mit",
  ends_with: "Endet mit",
  exact: "Exakt",
  regex: "Regex",
};

const STEPS = [
  "Name & Keywords",
  "Aufwandskonto",
  "Gegenkonto",
  "Priorität",
  "Vorschau",
  "Speichern",
] as const;

type RuleDraft = {
  id?: string;
  name: string;
  keywordsText: string;
  matchMode: MatchMode;
  caseSensitive: boolean;
  expenseAccountId: string;
  offsetAccountId: string;
  priority: number;
  enabled: boolean;
};

const EMPTY_DRAFT: RuleDraft = {
  name: "",
  keywordsText: "",
  matchMode: "contains",
  caseSensitive: false,
  expenseAccountId: "",
  offsetAccountId: "",
  priority: 50,
  enabled: true,
};

function matchesPreview(
  hay: string,
  keywords: string[],
  matchMode: MatchMode,
  caseSensitive: boolean
) {
  const text = caseSensitive ? hay : hay.toLowerCase();
  return keywords.some((kw) => {
    const needle = caseSensitive ? kw : kw.toLowerCase();
    switch (matchMode) {
      case "starts_with":
        return text.startsWith(needle);
      case "ends_with":
        return text.endsWith(needle);
      case "exact":
        return text.trim() === needle.trim();
      case "regex":
        try {
          return new RegExp(kw, caseSensitive ? "" : "i").test(hay);
        } catch {
          return false;
        }
      case "contains":
      default:
        return text.includes(needle);
    }
  });
}

interface RuleWizardDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<AccountingRule>;
}

export function RuleWizardDialog({
  open,
  onOpenChange,
  initial,
}: RuleWizardDialogProps) {
  const accounts = useAccountingStore((s) => s.accounts);
  const transactions = useAccountingStore((s) => s.transactions);
  const upsertRule = useAccountingStore((s) => s.upsertRule);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<RuleDraft>(EMPTY_DRAFT);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDraft({
      id: initial?.id,
      name: initial?.name ?? "",
      keywordsText: (initial?.keywords ?? []).join(", "),
      matchMode: initial?.matchMode ?? "contains",
      caseSensitive: initial?.caseSensitive ?? false,
      expenseAccountId: initial?.expenseAccountId ?? "",
      offsetAccountId: initial?.offsetAccountId ?? "",
      priority: initial?.priority ?? 50,
      enabled: initial?.enabled ?? true,
    });
  }, [open, initial]);

  const keywords = useMemo(
    () =>
      draft.keywordsText
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    [draft.keywordsText]
  );

  const expenseAccounts = accounts.filter(
    (a) => a.type === "expense" && a.status === "active"
  );
  const offsetAccounts = accounts.filter(
    (a) => a.type === "offset" && a.status === "active"
  );

  const previewTxs = useMemo(() => {
    if (!keywords.length) return [];
    return transactions
      .filter((t) => {
        const hay = `${t.counterparty} ${t.description} ${t.reference}`;
        return matchesPreview(hay, keywords, draft.matchMode, draft.caseSensitive);
      })
      .slice(0, 25);
  }, [transactions, keywords, draft.matchMode, draft.caseSensitive]);

  const progressValue = ((step + 1) / STEPS.length) * 100;

  const canNext = () => {
    switch (step) {
      case 0:
        return draft.name.trim().length > 0 && keywords.length > 0;
      case 1:
        return !!draft.expenseAccountId;
      case 2:
        return !!draft.offsetAccountId;
      case 3:
        return Number.isFinite(draft.priority);
      default:
        return true;
    }
  };

  const handleSave = () => {
    if (!draft.name.trim() || !keywords.length || !draft.expenseAccountId || !draft.offsetAccountId) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    const rule = upsertRule({
      id: draft.id,
      name: draft.name.trim(),
      keywords,
      matchMode: draft.matchMode,
      caseSensitive: draft.caseSensitive,
      expenseAccountId: draft.expenseAccountId,
      offsetAccountId: draft.offsetAccountId,
      priority: draft.priority,
      enabled: draft.enabled,
    });
    toast.success(draft.id ? `Regel „${rule.name}“ aktualisiert` : `Regel „${rule.name}“ erstellt`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {draft.id ? "Regel bearbeiten" : "Neue Regel"}
          </DialogTitle>
          <DialogDescription>
            Schritt {step + 1} von {STEPS.length}: {STEPS[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Progress value={progressValue} />
          <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={i === step ? "font-semibold text-foreground" : undefined}
              >
                {i + 1}.{label}
                {i < STEPS.length - 1 ? " · " : ""}
              </span>
            ))}
          </div>
        </div>

        <div className="min-h-[220px] space-y-4 py-2">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Name</Label>
                <Input
                  id="rule-name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="z. B. DHL Versand"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-keywords">Keywords (kommagetrennt)</Label>
                <Input
                  id="rule-keywords"
                  value={draft.keywordsText}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, keywordsText: e.target.value }))
                  }
                  placeholder="DHL, DEUTSCHE POST"
                />
              </div>
              <div className="space-y-2">
                <Label>Match-Modus</Label>
                <Select
                  value={draft.matchMode}
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      matchMode: (v as MatchMode) ?? "contains",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {MATCH_MODE_LABELS[draft.matchMode]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MATCH_MODE_LABELS) as MatchMode[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {MATCH_MODE_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.caseSensitive}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({ ...d, caseSensitive: !!v }))
                  }
                />
                Groß-/Kleinschreibung beachten
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <Label>Aufwandskonto</Label>
              <Select
                value={draft.expenseAccountId || undefined}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, expenseAccountId: v ?? "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Konto wählen">
                    {draft.expenseAccountId
                      ? accountLabel(accounts, draft.expenseAccountId)
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
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label>Gegenkonto</Label>
              <Select
                value={draft.offsetAccountId || undefined}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, offsetAccountId: v ?? "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Konto wählen">
                    {draft.offsetAccountId
                      ? accountLabel(accounts, draft.offsetAccountId)
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
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-priority">Priorität (niedriger = früher)</Label>
                <Input
                  id="rule-priority"
                  type="number"
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      priority: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.enabled}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({ ...d, enabled: !!v }))
                  }
                />
                Regel aktivieren
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {previewTxs.length} passende Transaktion(en) (max. 25 angezeigt)
              </p>
              <div className="max-h-56 overflow-auto rounded-lg border border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Gegenpartei</TableHead>
                      <TableHead>Betrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewTxs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Keine Treffer
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewTxs.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{formatDate(t.date)}</TableCell>
                          <TableCell className="max-w-[180px] truncate">
                            {t.counterparty}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatCurrencyPrecise(t.amount, t.currency)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                <strong>{draft.name || "—"}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Keywords:</span>{" "}
                {keywords.join(", ") || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Modus:</span>{" "}
                {MATCH_MODE_LABELS[draft.matchMode]}
                {draft.caseSensitive ? " · case-sensitive" : ""}
              </p>
              <p>
                <span className="text-muted-foreground">Aufwand:</span>{" "}
                {accountLabel(accounts, draft.expenseAccountId)}
              </p>
              <p>
                <span className="text-muted-foreground">Gegenkonto:</span>{" "}
                {accountLabel(accounts, draft.offsetAccountId)}
              </p>
              <p>
                <span className="text-muted-foreground">Priorität:</span>{" "}
                {draft.priority} · {draft.enabled ? "Aktiv" : "Inaktiv"}
              </p>
              <p>
                <span className="text-muted-foreground">Vorschau-Treffer:</span>{" "}
                {previewTxs.length}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Zurück
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              Weiter
            </Button>
          ) : (
            <Button onClick={handleSave}>Regel speichern</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
