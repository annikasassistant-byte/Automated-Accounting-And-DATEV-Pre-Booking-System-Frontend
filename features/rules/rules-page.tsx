"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Play, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableScroll } from "@/components/shared/table-scroll";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import type { AccountingRule, MatchMode } from "@/types/accounting";
import { accountLabel } from "@/store/accounting-store";
import { useAuthStore } from "@/lib/auth-store";
import {
  useGetRulesQuery,
  useGetAccountsQuery,
  useDeleteRuleMutation,
  useEnableRuleMutation,
  useDisableRuleMutation,
  useApplyRulesMutation,
  useTestRulesMutation,
} from "@/services/accountingApi";
import { RuleWizardDialog } from "@/features/rules/rule-wizard-dialog";

const MATCH_MODE_LABELS: Record<MatchMode, string> = {
  contains: "Enthält",
  starts_with: "Beginnt mit",
  ends_with: "Endet mit",
  exact: "Exakt",
  regex: "Regex",
};

export function RulesPage() {
  const { data: rules = [], isLoading } = useGetRulesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const [deleteRuleMut] = useDeleteRuleMutation();
  const [enableRule] = useEnableRuleMutation();
  const [disableRule] = useDisableRuleMutation();
  const [applyRules, { isLoading: applying }] = useApplyRulesMutation();
  const [testRules, { isLoading: testing }] = useTestRulesMutation();
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));

  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<AccountingRule> | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    matchCount: number;
    totalScanned: number;
    samples: Array<{
      _id: string;
      bookingDate?: string;
      amountCents?: number;
      counterpartyName?: string;
      purpose?: string;
      status?: string;
    }>;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = [...rules].sort((a, b) => a.priority - b.priority);
    if (!q) return list;
    return list.filter((r) => {
      const hay = [
        r.name,
        r.keywords.join(" "),
        MATCH_MODE_LABELS[r.matchMode],
        accountLabel(accounts, r.expenseAccountId),
        accountLabel(accounts, r.offsetAccountId),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rules, accounts, search]);

  const confirmApply = async () => {
    try {
      const result = await applyRules().unwrap();
      toast.success(
        `${result.applied ?? 0} geprüft · ${result.matched ?? "?"} matched · ${result.conflict ?? "?"} Konflikt · ${result.open ?? "?"} offen · ${result.skipped ?? "?"} übersprungen`,
      );
      setApplyOpen(false);
    } catch {
      toast.error("Fehler beim Anwenden der Regeln");
    }
  };

  const runDryPreview = async (ruleId?: string) => {
    try {
      const result = (await testRules(
        ruleId ? { ruleId } : { conditions: [{ field: "source", operator: "any_of", value: ["bank", "paypal"] }] },
      ).unwrap()) as {
        matchCount?: number;
        totalScanned?: number;
        samples?: Array<{
          _id: string;
          bookingDate?: string;
          amountCents?: number;
          counterpartyName?: string;
          purpose?: string;
          status?: string;
        }>;
      };
      setPreviewData({
        matchCount: result.matchCount ?? 0,
        totalScanned: result.totalScanned ?? 0,
        samples: result.samples ?? [],
      });
      setPreviewOpen(true);
    } catch {
      toast.error("Vorschau fehlgeschlagen");
    }
  };

  const openCreate = () => {
    setEditing(undefined);
    setWizardOpen(true);
  };

  const openEdit = (rule: AccountingRule) => {
    setEditing(rule);
    setWizardOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRuleMut(deleteId).unwrap();
      toast.success("Regel gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    }
    setDeleteId(null);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      if (enabled) {
        await enableRule(id).unwrap();
      } else {
        await disableRule(id).unwrap();
      }
      toast.success(enabled ? "Regel aktiviert" : "Regel deaktiviert");
    } catch {
      toast.error("Fehler beim Umschalten");
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Buchungsregeln"
        eyebrow="Automatisierung"
        description="Bedingungen und Konten zuordnen. Priorität sortiert die Liste — bei mehreren Treffern entsteht ein Konflikt (kein automatischer Gewinner)."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setApplyOpen(true)}>
              <Play className="mr-2 h-4 w-4" />
              Regel anwenden
            </Button>
            {isAdmin && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Neue Regel
              </Button>
            )}
          </div>
        }
      />

      <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-muted/20 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p>
            <strong className="text-foreground">Priorität:</strong> Niedriger = früher in der Liste
            (Beispiel: 10 vor 50). Default 50. Bei mehreren passenden Regeln bleibt der Status{" "}
            <strong className="text-foreground">Konflikt</strong> — Priorität wählt keinen Sieger.
          </p>
          <p>
            Import wendet Regeln automatisch an. „Regel anwenden“ schreibt erneut auf Status offen /
            importiert / Konflikt / matched / suggested (nicht reviewed/exported; S5-Clearing bleibt
            geschützt). „Neu anwenden“ in der Import-Historie betrifft nur einen Batch.
          </p>
        </div>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Regeln durchsuchen…"
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Keine Regeln"
          description="Erstellen Sie eine Regel oder passen Sie die Suche an."
          actionLabel={isAdmin ? "Regel erstellen" : undefined}
          onAction={isAdmin ? openCreate : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/60">
          <TableScroll className="max-h-[min(70vh,720px)] overflow-y-auto" hint={false}>
            <p className="mb-2 px-3 pt-2 text-xs text-muted-foreground md:hidden">
              Scrollen für alle Regeln und Spalten
            </p>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-md">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Aktiv</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Modus</TableHead>
                  <TableHead>Aufwand</TableHead>
                  <TableHead>Gegenkonto</TableHead>
                  <TableHead title="Niedriger = früher sortiert; kein Auto-Gewinner">
                    Priorität
                  </TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Treffer</TableHead>
                  <TableHead>Aktualisiert</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">Aktionen</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(v) => handleToggle(rule.id, v)}
                        disabled={!isAdmin}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <div className="flex max-w-[200px] flex-wrap gap-1">
                        {rule.keywords.slice(0, 3).map((kw) => (
                          <StatusBadge key={kw} status="suggested" label={kw} />
                        ))}
                        {rule.keywords.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{rule.keywords.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {MATCH_MODE_LABELS[rule.matchMode]}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm">
                      {accountLabel(accounts, rule.expenseAccountId)}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm">
                      {rule.useMappedPaymentAccount
                        ? "Zahlungskonto (Importquelle)"
                        : accountLabel(accounts, rule.offsetAccountId)}
                    </TableCell>
                    <TableCell className="tabular-nums">{rule.priority}</TableCell>
                    <TableCell className="tabular-nums">v{rule.version}</TableCell>
                    <TableCell className="tabular-nums">{rule.matchCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(rule.updatedAt)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="space-x-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={testing}
                          onClick={() => void runDryPreview(rule.id)}
                        >
                          Test
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(rule)}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Bearbeiten
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteId(rule.id)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Löschen
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        </div>
      )}

      <RuleWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initial={editing}
      />

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regeln erneut anwenden?</DialogTitle>
            <DialogDescription>
              Alle aktiven Regeln werden auf Transaktionen mit Status offen, importiert, Konflikt,
              matched oder suggested angewendet (max. 5000). Nicht betroffen: reviewed, exported,
              sowie System-Clearing Bank↔PayPal (S5). Nach dem Anlegen/Bearbeiten einer Regel dieses
              „Regel anwenden“ nutzen — historische reviewed/exported Buchungen ändern sich nicht
              automatisch.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Abbrechen
            </Button>
            <Button disabled={applying} onClick={() => void confirmApply()}>
              Jetzt anwenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Regel-Vorschau (ohne Schreiben)</DialogTitle>
            <DialogDescription>
              {previewData
                ? `${previewData.matchCount} Treffer von ${previewData.totalScanned} gescannten Transaktionen`
                : "Keine Daten"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {(previewData?.samples || []).map((s) => (
              <div key={s._id} className="rounded-lg border border-border/40 p-2">
                <p className="font-medium">{s.counterpartyName || "—"}</p>
                <p className="text-muted-foreground">{s.purpose || "—"}</p>
                <p className="tabular-nums text-xs">
                  {s.bookingDate ? String(s.bookingDate).slice(0, 10) : "—"} ·{" "}
                  {s.amountCents != null ? (s.amountCents / 100).toFixed(2) : "—"} € · {s.status}
                </p>
              </div>
            ))}
            {!previewData?.samples?.length && (
              <p className="text-muted-foreground">Keine Beispiel-Treffer</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regel löschen?</DialogTitle>
            <DialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Zugeordnete
              Transaktionen behalten ihre bisherigen Konten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
