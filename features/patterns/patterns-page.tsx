"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Ban,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PatternAction, PatternGroup } from "@/types/accounting";
import { accountLabel } from "@/store/accounting-store";
import {
  useGetRuleSuggestionsQuery,
  useGetAccountsQuery,
  useAcceptSuggestionMutation,
  useRejectSuggestionMutation,
  useAnalyzePatternsMutation,
} from "@/services/accountingApi";
import { RuleWizardDialog } from "@/features/rules/rule-wizard-dialog";

const STATUS_LABELS: Record<PatternAction, string> = {
  pending: "Ausstehend",
  ignored: "Ignoriert",
  merged: "Zusammengeführt",
  split: "Aufgeteilt",
  rule_created: "Regel erstellt",
};

type SortKey = "confidence" | "count" | "keyword";

export function PatternsPage() {
  const { data: patterns = [], isLoading } = useGetRuleSuggestionsQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const [acceptSuggestion] = useAcceptSuggestionMutation();
  const [rejectSuggestion] = useRejectSuggestionMutation();
  const [analyzePatterns, { isLoading: analyzing }] = useAnalyzePatternsMutation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatternAction | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitial, setWizardInitial] = useState<
    | {
        name?: string;
        keywords?: string[];
        expenseAccountId?: string;
        offsetAccountId?: string;
      }
    | undefined
  >();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = [...patterns];
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (q) {
      list = list.filter((p) => {
        const hay = [p.keyword, p.suggestedRuleName, p.status]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    list.sort((a, b) => {
      if (sortKey === "keyword") return a.keyword.localeCompare(b.keyword, "de");
      if (sortKey === "count")
        return b.transactionIds.length - a.transactionIds.length;
      return b.confidence - a.confidence;
    });
    return list;
  }, [patterns, search, statusFilter, sortKey]);

  const handleAccept = async (p: PatternGroup) => {
    setWizardInitial({
      name: p.suggestedRuleName,
      keywords: [p.keyword],
      expenseAccountId: p.expenseAccountId,
      offsetAccountId: p.offsetAccountId,
    });
    try {
      await acceptSuggestion(p.id).unwrap();
      toast.success(`Vorschlag „${p.keyword}" angenommen`);
      setWizardOpen(true);
    } catch {
      toast.error("Fehler beim Annehmen");
    }
  };

  const handleReject = async (p: PatternGroup) => {
    try {
      await rejectSuggestion(p.id).unwrap();
      toast.success(`Muster „${p.keyword}" abgelehnt`);
    } catch {
      toast.error("Fehler beim Ablehnen");
    }
  };

  const handleAnalyze = async () => {
    try {
      await analyzePatterns().unwrap();
      toast.success("Muster-Analyse gestartet");
    } catch {
      toast.error("Analyse fehlgeschlagen");
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Muster & Vorschläge"
        eyebrow="KI / Heuristik"
        description="Wiederkehrende Keyword-Gruppen prüfen und in Regeln überführen."
        action={
          <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            Analyse starten
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-muted/15 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Muster durchsuchen…"
          className="w-full sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter((v as PatternAction | "all") ?? "all")
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                {statusFilter === "all"
                  ? "Alle Status"
                  : STATUS_LABELS[statusFilter]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              {(Object.keys(STATUS_LABELS) as PatternAction[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey((v as SortKey) ?? "confidence")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                <span className="inline-flex items-center gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortKey === "confidence"
                    ? "Konfidenz"
                    : sortKey === "count"
                      ? "Anzahl"
                      : "Keyword"}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Konfidenz</SelectItem>
              <SelectItem value="count">Anzahl</SelectItem>
              <SelectItem value="keyword">Keyword</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Keine Muster"
          description="Keine Pattern-Gruppen für die aktuellen Filter."
          actionLabel="Filter zurücksetzen"
          onAction={() => {
            setSearch("");
            setStatusFilter("all");
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="flex flex-col border-border/50">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-semibold tracking-tight">
                    {p.keyword}
                  </CardTitle>
                  <StatusBadge
                    status={p.status === "pending" ? "pending" : p.status}
                    label={STATUS_LABELS[p.status]}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Konfidenz</span>
                    <span className="font-medium tabular-nums">
                      {p.confidence.toFixed(0)} %
                    </span>
                  </div>
                  <Progress value={p.confidence} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {p.transactionIds.length} Transaktion(en) · Vorschlag:{" "}
                  <span className="font-medium text-foreground">
                    {p.suggestedRuleName}
                  </span>
                </p>
                {(p.expenseAccountId || p.offsetAccountId) && (
                  <p className="text-xs text-muted-foreground">
                    {accountLabel(accounts, p.expenseAccountId)} →{" "}
                    {accountLabel(accounts, p.offsetAccountId)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter className="flex flex-wrap gap-2 border-t border-border/40 pt-4">
                <Button
                  size="sm"
                  onClick={() => handleAccept(p)}
                  disabled={p.status === "rule_created"}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Regel erstellen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(p)}
                  disabled={p.status === "ignored"}
                >
                  <Ban className="mr-1.5 h-3.5 w-3.5" />
                  Ignorieren
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <RuleWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initial={wizardInitial}
      />
    </div>
  );
}
