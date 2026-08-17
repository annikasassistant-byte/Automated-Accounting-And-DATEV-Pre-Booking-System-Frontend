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
import { Package, Truck, BarChart3, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { formatCurrencyPrecise, formatPercent } from "@/lib/format";
import {
  useGetAccountTotalsQuery,
  useGetStatusBreakdownQuery,
  useGetExportsQuery,
} from "@/services/accountingApi";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const ACCOUNT_HIGHLIGHTS = ["3220", "1361", "81971", "81972", "81973", "81974", "81975", "81976", "4910", "1201", "1203"];

export function ReportsPage() {
  const { data: accountTotals = [], isLoading: totalsLoading } = useGetAccountTotalsQuery();
  const { data: statusBreakdown = [], isLoading: breakdownLoading } = useGetStatusBreakdownQuery();
  const { data: exports = [] } = useGetExportsQuery();

  const isLoading = totalsLoading || breakdownLoading;

  const highlightedTotals = useMemo(
    () =>
      accountTotals
        .filter((t) => ACCOUNT_HIGHLIGHTS.includes(t.accountNumber))
        .sort((a, b) => Math.abs(b.total) - Math.abs(a.total)),
    [accountTotals]
  );

  const topTotals = useMemo(
    () =>
      [...accountTotals]
        .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
        .slice(0, 10)
        .map((t) => ({
          name: `${t.accountNumber}${t.accountName ? ` ${t.accountName.slice(0, 16)}` : ""}`,
          amount: Math.abs(t.total),
        })),
    [accountTotals]
  );

  const statusPieData = useMemo(
    () =>
      statusBreakdown
        .filter((s) => s.count > 0)
        .map((s) => ({ name: s.status, value: s.count })),
    [statusBreakdown]
  );

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

  const primaryAccount = highlightedTotals[0];
  const secondaryAccount = highlightedTotals[1];

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Berichte"
        eyebrow="Auswertung"
        description="Kontensalden, Statusverteilung und Export-Erfolg auf einen Blick."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          title={primaryAccount ? `Konto ${primaryAccount.accountNumber}` : "Hauptkonto"}
          value={formatCurrencyPrecise(primaryAccount?.total ?? 0)}
          subtitle={primaryAccount?.accountName ?? "Kein Hauptkonto"}
          icon={Package}
        />
        <MetricCard
          title={secondaryAccount ? `Konto ${secondaryAccount.accountNumber}` : "Nebenkonto"}
          value={formatCurrencyPrecise(secondaryAccount?.total ?? 0)}
          subtitle={secondaryAccount?.accountName ?? "Kein Nebenkonto"}
          icon={Truck}
          delay={0.05}
        />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <ChartCard title="Top-Konten nach Volumen" description="Absolute Kontensalden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topTotals.length ? topTotals : [{ name: "—", amount: 0 }]}
              layout="vertical"
              margin={{ left: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrencyPrecise(Number(v))} />
              <Bar dataKey="amount" name="Betrag" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status-Verteilung" description="Transaktionen nach Status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusPieData.length ? statusPieData : [{ name: "Keine", value: 1 }]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {(statusPieData.length ? statusPieData : [{ name: "Keine", value: 1 }]).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
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

        {highlightedTotals.length > 2 && (
          <ChartCard title="Schwerpunkt-Konten" description="3220, 1361, 81971–81976, 4910, 1201, 1203">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={highlightedTotals.map((t) => ({
                  name: t.accountNumber,
                  amount: Math.abs(t.total),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrencyPrecise(Number(v))} />
                <Bar dataKey="amount" name="Betrag" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
