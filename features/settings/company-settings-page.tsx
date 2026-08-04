"use client";

import { useEffect, useState } from "react";
import { Link2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccountingStore } from "@/store/accounting-store";
import type { CompanySettings, DatevSettings } from "@/types/accounting";

export function CompanySettingsPage() {
  const company = useAccountingStore((s) => s.company);
  const datev = useAccountingStore((s) => s.datev);
  const setCompany = useAccountingStore((s) => s.setCompany);
  const setDatev = useAccountingStore((s) => s.setDatev);

  const [companyForm, setCompanyForm] = useState<CompanySettings>(company);
  const [datevForm, setDatevForm] = useState<DatevSettings>(datev);

  useEffect(() => {
    setCompanyForm(company);
  }, [company]);

  useEffect(() => {
    setDatevForm(datev);
  }, [datev]);

  const saveCompany = () => {
    if (!companyForm.companyName.trim()) {
      toast.error("Firmenname ist erforderlich");
      return;
    }
    setCompany(companyForm);
    toast.success("Firmeneinstellungen gespeichert");
  };

  const saveDatev = () => {
    if (!datevForm.consultantNumber.trim() || !datevForm.clientNumber.trim()) {
      toast.error("Berater- und Mandantennummer sind erforderlich");
      return;
    }
    setDatev(datevForm);
    toast.success("DATEV-Einstellungen gespeichert");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Firmen- & DATEV-Einstellungen"
        eyebrow="Konfiguration"
        description="Stammdaten für Exporte. Design/Theme bleibt in den allgemeinen Einstellungen."
      />

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Firma</TabsTrigger>
          <TabsTrigger value="datev">DATEV</TabsTrigger>
          <TabsTrigger value="links">Zuordnungen</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle>Firmendaten</CardTitle>
              <CardDescription>Werden in Export-Metadaten und Berichten verwendet.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="companyName">Firmenname</Label>
                <Input
                  id="companyName"
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxId">USt-IdNr.</Label>
                <Input
                  id="taxId"
                  value={companyForm.taxId}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, taxId: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={companyForm.country}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, country: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="street">Straße</Label>
                <Input
                  id="street"
                  value={companyForm.street}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, street: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalCode">PLZ</Label>
                <Input
                  id="postalCode"
                  value={companyForm.postalCode}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, postalCode: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Ort</Label>
                <Input
                  id="city"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={saveCompany}>
                  <Save className="mr-2 h-4 w-4" />
                  Firma speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datev" className="mt-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle>DATEV-Parameter</CardTitle>
              <CardDescription>Berater, Mandant und Standardkonten für den Buchungsstapel.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="consultantNumber">Beraternummer</Label>
                <Input
                  id="consultantNumber"
                  value={datevForm.consultantNumber}
                  onChange={(e) =>
                    setDatevForm((f) => ({ ...f, consultantNumber: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientNumber">Mandantennummer</Label>
                <Input
                  id="clientNumber"
                  value={datevForm.clientNumber}
                  onChange={(e) => setDatevForm((f) => ({ ...f, clientNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chartOfAccounts">Kontenrahmen</Label>
                <Input
                  id="chartOfAccounts"
                  value={datevForm.chartOfAccounts}
                  onChange={(e) =>
                    setDatevForm((f) => ({ ...f, chartOfAccounts: e.target.value }))
                  }
                  placeholder="SKR03 / SKR04"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fiscalYearStart">Wirtschaftsjahresbeginn</Label>
                <Input
                  id="fiscalYearStart"
                  type="date"
                  value={datevForm.fiscalYearStart}
                  onChange={(e) =>
                    setDatevForm((f) => ({ ...f, fiscalYearStart: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultExpenseAccount">Standard Aufwandskonto</Label>
                <Input
                  id="defaultExpenseAccount"
                  value={datevForm.defaultExpenseAccount}
                  onChange={(e) =>
                    setDatevForm((f) => ({ ...f, defaultExpenseAccount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultOffsetAccount">Standard Gegenkonto</Label>
                <Input
                  id="defaultOffsetAccount"
                  value={datevForm.defaultOffsetAccount}
                  onChange={(e) =>
                    setDatevForm((f) => ({ ...f, defaultOffsetAccount: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={saveDatev}>
                  <Save className="mr-2 h-4 w-4" />
                  DATEV speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4 text-primary" />
                  Kontenplan
                </CardTitle>
                <CardDescription>
                  Konten (z. B. 4400 Wareneinkauf, 4910 Versand) unter Stammdaten → Kontenplan
                  pflegen. Der hier gewählte Kontenrahmen ({datevForm.chartOfAccounts || "—"}) sollte
                  zum DATEV-Mandanten passen.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4 text-primary" />
                  CSV-Mapping
                </CardTitle>
                <CardDescription>
                  Bank- und PayPal-Spalten werden beim Import automatisch auf Datum, Betrag,
                  Gegenpartei und Verwendungszweck gemappt. Detaillierte Mapping-Regeln liegen in
                  den Import-Assistenten.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/40 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Darstellung / Theme</CardTitle>
                <CardDescription>
                  Hell-/Dunkelmodus und Benachrichtigungen werden in den bestehenden allgemeinen
                  Einstellungen verwaltet — nicht auf dieser Seite.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
