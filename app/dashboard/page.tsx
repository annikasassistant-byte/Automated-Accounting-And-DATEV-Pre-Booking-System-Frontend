"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  FileOutput,
  Landmark,
  Scale,
  Sparkles,
  Wallet,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccountingStore } from "@/store/accounting-store";
import { formatCurrencyPrecise } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

export default function UserDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const transactions = useAccountingStore((s) => s.transactions);
  const rules = useAccountingStore((s) => s.rules);
  const exports = useAccountingStore((s) => s.exports);
  const patterns = useAccountingStore((s) => s.patterns);

  const openCount = transactions.filter((t) =>
    ["new", "suggested", "matched"].includes(t.status)
  ).length;
  const exportedCount = transactions.filter((t) => t.exportStatus === "exported").length;
  const pendingPatterns = patterns.filter((p) => p.status === "pending").length;
  const volume = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);

  const links = [
    { href: "/dashboard/import/bank", label: "Bank importieren", icon: Landmark },
    { href: "/dashboard/import/paypal", label: "PayPal importieren", icon: Wallet },
    { href: "/dashboard/transactions", label: "Transaktionen", icon: ArrowLeftRight },
    { href: "/dashboard/rules", label: "Regelwerk", icon: Scale },
    { href: "/dashboard/patterns", label: "Muster", icon: Sparkles },
    { href: "/dashboard/export", label: "DATEV-Export", icon: FileOutput },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        hero
        eyebrow="Buchhaltung"
        title={`Willkommen, ${user?.name?.split(" ")[0] || "Benutzer"}`}
        description="CSV-Importe, Regelengine und DATEV-Export in einem Portal."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Offene Buchungen" value={String(openCount)} icon={ArrowLeftRight} />
        <MetricCard
          title="Umsatzvolumen"
          value={formatCurrencyPrecise(volume)}
          icon={Wallet}
          subtitle={`${transactions.length} Transaktionen`}
        />
        <MetricCard title="Aktive Regeln" value={String(rules.filter((r) => r.enabled).length)} icon={Scale} />
        <MetricCard
          title="DATEV-Exporte"
          value={String(exports.length)}
          icon={FileOutput}
          subtitle={`${exportedCount} exportierte Zeilen · ${pendingPatterns} Muster offen`}
        />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Schnellzugriff</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => (
            <Button
              key={item.href}
              variant="outline"
              className="justify-start"
              render={<Link href={item.href} />}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
