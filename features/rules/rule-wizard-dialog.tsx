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
import type { AccountingRule } from "@/types/accounting";
import { accountLabel } from "@/store/accounting-store";
import {
  useGetAccountsQuery,
  useCreateRuleMutation,
  useUpdateRuleMutation,
} from "@/services/accountingApi";

const STEPS = ["Name", "Bedingungen", "Aktionen", "Priorität", "Speichern"] as const;

const FIELD_OPTIONS = [
  { value: "rawDescription", label: "Beschreibung / Verwendungszweck" },
  { value: "purpose", label: "Purpose" },
  { value: "counterpartyName", label: "Gegenpartei / Payee" },
  { value: "counterpartyIban", label: "IBAN" },
  { value: "counterpartyEmail", label: "E-Mail" },
  { value: "source", label: "Importquelle" },
  { value: "direction", label: "Richtung (in/out)" },
  { value: "txnType", label: "Transaktionstyp (PayPal)" },
  { value: "amountCents", label: "Betrag (Cent)" },
  { value: "article", label: "Artikel" },
] as const;

const OPERATOR_OPTIONS = [
  { value: "contains", label: "Enthält" },
  { value: "not_contains", label: "Enthält nicht" },
  { value: "exact", label: "Gleich" },
  { value: "starts_with", label: "Beginnt mit" },
  { value: "ends_with", label: "Endet mit" },
  { value: "any_of", label: "Eines von (Komma)" },
  { value: "between", label: "Zwischen" },
  { value: "eq", label: "= (Zahl)" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
  { value: "is_empty", label: "Ist leer" },
  { value: "is_not_empty", label: "Ist nicht leer" },
  { value: "is_negative", label: "Negativ (Ausgabe)" },
  { value: "is_positive", label: "Positiv (Eingang)" },
] as const;

type CondDraft = {
  field: string;
  operator: string;
  value: string;
  caseSensitive: boolean;
};

type RuleDraft = {
  id?: string;
  name: string;
  conditionLogic: "and" | "or";
  conditions: CondDraft[];
  expenseAccountId: string;
  offsetAccountId: string;
  useMappedPaymentAccount: boolean;
  buKey: string;
  priority: number;
  enabled: boolean;
  validFrom: string;
  validTo: string;
};

const EMPTY_COND: CondDraft = {
  field: "rawDescription",
  operator: "contains",
  value: "",
  caseSensitive: false,
};

const EMPTY_DRAFT: RuleDraft = {
  name: "",
  conditionLogic: "and",
  conditions: [{ ...EMPTY_COND }],
  expenseAccountId: "",
  offsetAccountId: "",
  useMappedPaymentAccount: false,
  buKey: "",
  priority: 50,
  enabled: true,
  validFrom: "",
  validTo: "",
};

function parseConditionValue(cond: CondDraft): unknown {
  if (["is_empty", "is_not_empty", "is_negative", "is_positive"].includes(cond.operator)) {
    return null;
  }
  if (cond.operator === "any_of") {
    return cond.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (cond.operator === "between") {
    const parts = cond.value.split(/[,;–-]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return [Number(parts[0]), Number(parts[1])];
  }
  if (["eq", "gte", "lte", "lt", "gt"].includes(cond.operator) || cond.field === "amountCents") {
    const n = Number(cond.value);
    return Number.isFinite(n) ? n : cond.value;
  }
  return cond.value;
}

function conditionsFromRule(initial?: Partial<AccountingRule>): CondDraft[] {
  const raw = (initial as { conditions?: Array<{ field?: string; operator?: string; value?: unknown; caseSensitive?: boolean }> } | undefined)
    ?.conditions;
  if (raw?.length) {
    return raw.map((c) => ({
      field: c.field || "rawDescription",
      operator: c.operator || "contains",
      value: Array.isArray(c.value)
        ? c.value.join(", ")
        : c.value == null
          ? ""
          : String(c.value),
      caseSensitive: Boolean(c.caseSensitive),
    }));
  }
  const kws = initial?.keywords ?? [];
  if (kws.length) {
    return [
      {
        field: "rawDescription",
        operator: "any_of",
        value: kws.join(", "),
        caseSensitive: initial?.caseSensitive ?? false,
      },
    ];
  }
  return [{ ...EMPTY_COND }];
}

interface RuleWizardDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<AccountingRule>;
}

export function RuleWizardDialog({ open, onOpenChange, initial }: RuleWizardDialogProps) {
  const { data: accounts = [] } = useGetAccountsQuery();
  const [createRule] = useCreateRuleMutation();
  const [updateRule] = useUpdateRuleMutation();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<RuleDraft>(EMPTY_DRAFT);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDraft({
      id: initial?.id,
      name: initial?.name ?? "",
      conditionLogic:
        ((initial as { conditionLogic?: "and" | "or" })?.conditionLogic as "and" | "or") || "and",
      conditions: conditionsFromRule(initial),
      expenseAccountId: initial?.expenseAccountId ?? "",
      offsetAccountId: initial?.offsetAccountId ?? "",
      useMappedPaymentAccount: Boolean(initial?.useMappedPaymentAccount),
      buKey: "",
      priority: initial?.priority ?? 50,
      enabled: initial?.enabled ?? true,
      validFrom: "",
      validTo: "",
    });
  }, [open, initial]);

  const expenseAccounts = accounts.filter(
    (a) =>
      (a.type === "expense" || a.type === "revenue" || a.type === "other") && a.status === "active",
  );
  const offsetAccounts = accounts.filter(
    (a) =>
      (a.type === "asset" || a.type === "clearing" || a.type === "liability") &&
      a.status === "active",
  );

  const progressValue = ((step + 1) / STEPS.length) * 100;

  const conditionsValid = useMemo(
    () =>
      draft.conditions.some((c) => {
        if (["is_empty", "is_not_empty", "is_negative", "is_positive"].includes(c.operator)) {
          return true;
        }
        return c.value.trim().length > 0;
      }),
    [draft.conditions],
  );

  const canNext = () => {
    switch (step) {
      case 0:
        return draft.name.trim().length > 0;
      case 1:
        return conditionsValid;
      case 2:
        return !!draft.expenseAccountId && (draft.useMappedPaymentAccount || !!draft.offsetAccountId);
      case 3:
        return Number.isFinite(draft.priority);
      default:
        return true;
    }
  };

  const handleSave = async () => {
    if (!draft.name.trim() || !conditionsValid || !draft.expenseAccountId) {
      toast.error("Bitte Pflichtfelder prüfen");
      return;
    }
    if (!draft.useMappedPaymentAccount && !draft.offsetAccountId) {
      toast.error("Gegenkonto oder Importquellen-Konto wählen");
      return;
    }

    const conditions = draft.conditions.map((c) => ({
      field: c.field,
      operator: c.operator,
      value: parseConditionValue(c),
      caseSensitive: c.caseSensitive,
    }));

    const body = {
      name: draft.name.trim(),
      conditionLogic: draft.conditionLogic,
      conditions,
      actions: {
        konto: draft.expenseAccountId,
        gegenkonto: draft.useMappedPaymentAccount ? "" : draft.offsetAccountId,
        useMappedPaymentAccount: draft.useMappedPaymentAccount,
        buKey: draft.buKey.trim(),
        bookingTextTemplate: draft.name.trim(),
      },
      priority: draft.priority,
      enabled: draft.enabled,
      validFrom: draft.validFrom || null,
      validTo: draft.validTo || null,
      useMappedPaymentAccount: draft.useMappedPaymentAccount,
    };

    try {
      if (draft.id) {
        await updateRule({ id: draft.id, body }).unwrap();
        toast.success(`Regel „${draft.name}" aktualisiert (neue Version — Historie unverändert)`);
      } else {
        await createRule(body).unwrap();
        toast.success(`Regel „${draft.name}" erstellt`);
      }
      onOpenChange(false);
    } catch {
      toast.error("Fehler beim Speichern der Regel");
    }
  };

  const updateCond = (idx: number, patch: Partial<CondDraft>) => {
    setDraft((d) => ({
      ...d,
      conditions: d.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Regel bearbeiten" : "Neue Regel"}</DialogTitle>
          <DialogDescription>
            Schritt {step + 1} von {STEPS.length}: {STEPS[step]} — Bedingungen und Buchungsaktionen
            getrennt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Progress value={progressValue} />
          <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
            {STEPS.map((label, i) => (
              <span key={label} className={i === step ? "font-semibold text-foreground" : undefined}>
                {label}
                {i < STEPS.length - 1 ? " ·" : ""}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 py-2">
          {step === 0 && (
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="z. B. Vinted Wareneinkauf"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Verknüpfung der Bedingungen</Label>
                <Select
                  value={draft.conditionLogic}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, conditionLogic: (v as "and" | "or") || "and" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">UND (alle müssen passen)</SelectItem>
                    <SelectItem value="or">ODER (eine reicht)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {draft.conditions.map((cond, idx) => (
                <div key={idx} className="space-y-2 rounded-xl border border-border/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Bedingung {idx + 1}</p>
                    {draft.conditions.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            conditions: d.conditions.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        Entfernen
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Feld</Label>
                      <Select
                        value={cond.field}
                        onValueChange={(v) => updateCond(idx, { field: v ?? "rawDescription" })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Operator</Label>
                      <Select
                        value={cond.operator}
                        onValueChange={(v) => updateCond(idx, { operator: v ?? "contains" })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATOR_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {!["is_empty", "is_not_empty", "is_negative", "is_positive"].includes(
                    cond.operator,
                  ) && (
                    <div className="space-y-1">
                      <Label>Wert</Label>
                      <Input
                        value={cond.value}
                        onChange={(e) => updateCond(idx, { value: e.target.value })}
                        placeholder={
                          cond.operator === "between"
                            ? "z. B. -50000,-1000"
                            : cond.operator === "any_of"
                              ? "keyword1, keyword2"
                              : cond.field === "source"
                                ? "bank oder paypal"
                                : cond.field === "direction"
                                  ? "in oder out"
                                  : "Text oder Zahl"
                        }
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={cond.caseSensitive}
                      onCheckedChange={(v) => updateCond(idx, { caseSensitive: !!v })}
                    />
                    Groß-/Kleinschreibung
                  </label>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft((d) => ({ ...d, conditions: [...d.conditions, { ...EMPTY_COND }] }))
                }
              >
                Bedingung hinzufügen
              </Button>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Gültig ab (optional)</Label>
                  <Input
                    type="date"
                    value={draft.validFrom}
                    onChange={(e) => setDraft((d) => ({ ...d, validFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Gültig bis (optional)</Label>
                  <Input
                    type="date"
                    value={draft.validTo}
                    onChange={(e) => setDraft((d) => ({ ...d, validTo: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Gültigkeitszeitraum der Regel ≠ Transaktionsdatum-Bedingung. Bearbeiten ändert keine
                historischen Buchungen automatisch.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Aufwandskonto / Erlöskonto</Label>
                <Select
                  value={draft.expenseAccountId || undefined}
                  onValueChange={(v) => setDraft((d) => ({ ...d, expenseAccountId: v ?? "" }))}
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
                      <SelectItem key={a.number} value={a.number}>
                        {a.number} · {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-start gap-2 rounded-lg border border-border/40 p-3 text-sm">
                <Checkbox
                  checked={draft.useMappedPaymentAccount}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      useMappedPaymentAccount: !!v,
                      offsetAccountId: v ? "" : d.offsetAccountId,
                    }))
                  }
                />
                <span>
                  <span className="font-medium text-foreground">
                    Zahlungskonto der Importquelle verwenden
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    Gegenkonto = Bank (1201) oder PayPal (1203) je nach Import — eine Vinted-Regel für
                    beide Quellen.
                  </span>
                </span>
              </label>

              {!draft.useMappedPaymentAccount && (
                <div className="space-y-2">
                  <Label>Gegenkonto (fest)</Label>
                  <Select
                    value={draft.offsetAccountId || undefined}
                    onValueChange={(v) => setDraft((d) => ({ ...d, offsetAccountId: v ?? "" }))}
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
                        <SelectItem key={a.number} value={a.number}>
                          {a.number} · {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bu">BU-Schlüssel (optional)</Label>
                <Input
                  id="bu"
                  value={draft.buKey}
                  onChange={(e) => setDraft((d) => ({ ...d, buKey: e.target.value }))}
                  placeholder="leer = keine BU"
                />
              </div>
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
                    setDraft((d) => ({ ...d, priority: Number(e.target.value) || 0 }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Priorität 10 vor 50. Default 50. Mehrere Treffer → Konflikt (kein Auto-Gewinner).
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.enabled}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: !!v }))}
                />
                Regel aktivieren
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2 rounded-xl border border-border/40 bg-muted/20 p-4 text-sm">
              <p>
                <strong>{draft.name}</strong>
              </p>
              <p>
                Bedingungen ({draft.conditionLogic.toUpperCase()}): {draft.conditions.length}
              </p>
              <p>
                Aufwand: {accountLabel(accounts, draft.expenseAccountId)} · Gegenkonto:{" "}
                {draft.useMappedPaymentAccount
                  ? "Importquelle"
                  : accountLabel(accounts, draft.offsetAccountId)}
              </p>
              <p>
                Priorität {draft.priority} · {draft.enabled ? "Aktiv" : "Inaktiv"}
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
            <Button onClick={() => void handleSave()}>Regel speichern</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
