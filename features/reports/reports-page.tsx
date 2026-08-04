"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Package, Truck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { formatCurrencyPrecise, formatPercent } from "@/lib/format";
import { accountLabel, useAccountingStore } from "@/store/accounting-store";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ReportsPage() {
  const imports = useAccountingStore((s) => s.imports);
  const rules = useAccountingStore((s) => s.rules);
  const transactions = useAccountingStore((s) => s.transactions);
  const exports = useAccountingStore((s) => s.exports);
  const accounts = useAccountingStore((s) => s.accounts);

  const inventoryPurchases = useMemo(
    () =>
      transactions
        .filter((t) => t.expenseAccountId === "acc-4400" || accountLabel(accounts, t.expenseAccountId).startsWith("4400"))
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions, accounts]
  );

  const shipping = useMemo(
    () =>
      transactions
        .filter((t) => t.expenseAccountId === "acc-4910" || accountLabel(accounts, t.expenseAccountId).startsWith("4910"))
        .reduce((s, t) => s + Math.abs(t.amount), 0),
    [transactions, accounts]
  );

  const monthlyImports = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of imports) {
      const key = b.importedAt.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + b.successCount);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }, [imports]);

  const ruleUsage = useMemo(
    () =>
      [...rules]
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 8)
        .map((r) => ({ name: r.name, matches: r.matchCount })),
    [rules]
  );

  const topCounterparties = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      map.set(t.counterparty, (map.get(t.counterparty) ?? 0) + Math.abs(t.amount));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, amount]) => ({ name: name.slice(0, 22), amount: Number(amount.toFixed(2)) }));
  }, [transactions]);

  const exportSuccess = useMemo(() => {
    const completed = exports.filter((e) => e.status === "completed" || e.status === "validated").length;
    const failed = exports.filter((e) => e.status === "failed").length;
    const draft = exports.filter((e) => e.status === "draft").length;
    const total = exports.length || 1;
    return {
      slices: [
        { name: "Erfolgreich", value: completed || (exports.length ? 0 : 1) },
        { name: "Fehlgeschlagen", value: failed },
        { name: "Entwurf", value: draft },
      ].filter((s) => s.value > 0),
      rate: formatPercent(((completed || (exports.length ? 0 : 1)) / total) * 100),
    };
  }, [exports]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Berichte"
        eyebrow="Auswertung"
        description="Importe, Regelnutzung, Gegenparteien und Export-Erfolg auf einen Blick."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          title="Wareneinkauf (4400)"
          value={formatCurrencyPrecise(inventoryPurchases)}
          subtitle="Inventory / Aufwandskonto 4400"
          icon={Package}
        />
        <MetricCard
          title="Versand (4910)"
          value={formatCurrencyPrecise(shipping)}
          subtitle="Porto & Versandkosten"
          icon={Truck}
          delay={0.05}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Monatliche Importe" description="Erfolgreiche Zeilen je Import-Batch">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyImports.length ? monthlyImports : [{ month: "—", count: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Importe" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Regelnutzung" description="matchCount der Zuordnungsregeln">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ruleUsage.length ? ruleUsage : [{ name: "—", matches: 0 }]}
              layout="vertical"
              margin={{ left: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="matches" name="Treffer" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top-Gegenparteien" description="Nach absolutem Umsatzvolumen">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCounterparties.length ? topCounterparties : [{ name: "—", amount: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatCurrencyPrecise(Number(v))} />
              <Bar dataKey="amount" name="Betrag" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Export-Erfolg"
          description={`Erfolgsquote ${exportSuccess.rate}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={exportSuccess.slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {exportSuccess.slices.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
