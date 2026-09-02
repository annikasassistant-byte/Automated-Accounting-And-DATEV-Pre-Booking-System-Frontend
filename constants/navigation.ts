import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Settings,
  User,
  Landmark,
  Wallet,
  ArrowLeftRight,
  Sparkles,
  Scale,
  BookOpen,
  ScrollText,
  FileOutput,
  Copy,
  GitCompare,
  BarChart3,
  Building2,
  ListTodo,
  AlertTriangle,
  Shield,
  Package,
  Store,
  Inbox,
  BookMarked,
  Coins,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

const accountingItems = (prefix: "/admin" | "/dashboard"): NavItem[] => [
  { title: "Bank-Import", href: `${prefix}/import/bank`, icon: Landmark },
  { title: "PayPal-Import", href: `${prefix}/import/paypal`, icon: Wallet },
  { title: "JTL-Import", href: `${prefix}/import/jtl`, icon: Package },
  { title: "Amazon-Import", href: `${prefix}/import/marketplace/amazon`, icon: Store },
  { title: "Back Market-Import", href: `${prefix}/import/marketplace/backmarket`, icon: Store },
  { title: "Refurbed-Import", href: `${prefix}/import/marketplace/refurbed`, icon: Store },
  { title: "Buchhaltungs-Posteingang", href: `${prefix}/accounting-inbox`, icon: Inbox },
  { title: "Geschäftsvorfälle", href: `${prefix}/accrual/events`, icon: BookMarked },
  { title: "Accrual-Journal", href: `${prefix}/accrual/journal`, icon: Coins },
  { title: "Marktplatz-Auszahlungen", href: `${prefix}/reconciliation/marketplace`, icon: GitCompare },
  { title: "Transaktionen", href: `${prefix}/transactions`, icon: ArrowLeftRight },
  { title: "Offene Posten", href: `${prefix}/transactions?status=open`, icon: ListTodo },
  { title: "Konflikte", href: `${prefix}/transactions?status=conflict`, icon: AlertTriangle },
  { title: "Mustererkennung", href: `${prefix}/patterns`, icon: Sparkles },
  { title: "Regelwerk", href: `${prefix}/rules`, icon: Scale },
  { title: "Kontenplan", href: `${prefix}/accounts`, icon: BookOpen },
  { title: "Kontenübersicht", href: `${prefix}/accounts/overview`, icon: ScrollText },
  { title: "DATEV-Export", href: `${prefix}/export`, icon: FileOutput },
  { title: "Duplikate", href: `${prefix}/duplicates`, icon: Copy },
  { title: "Abstimmung", href: `${prefix}/reconciliation`, icon: GitCompare },
  { title: "Berichte", href: `${prefix}/reports`, icon: BarChart3 },
];

export const adminNavGroups: NavGroup[] = [
  {
    label: "Übersicht",
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Benutzer", href: "/admin/users", icon: Users },
    ],
  },
  {
    label: "Buchhaltung",
    items: accountingItems("/admin"),
  },
  {
    label: "System",
    items: [
      { title: "Unternehmen", href: "/admin/settings/company", icon: Building2 },
      { title: "Marktplatz-Clearing", href: "/admin/settings/clearing", icon: Store },
      { title: "Systemrichtlinien", href: "/admin/settings/system-policies", icon: Shield },
      { title: "Einstellungen", href: "/admin/settings", icon: Settings },
      { title: "Profil", href: "/admin/profile", icon: User },
    ],
  },
];

export const userNavGroups: NavGroup[] = [
  {
    label: "Übersicht",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Buchhaltung",
    items: accountingItems("/dashboard"),
  },
  {
    label: "Konto",
    items: [
      { title: "Unternehmen", href: "/dashboard/settings/company", icon: Building2 },
      { title: "Einstellungen", href: "/dashboard/settings", icon: Settings },
      { title: "Profil", href: "/dashboard/profile", icon: User },
    ],
  },
];

export const adminNav: NavItem[] = adminNavGroups.flatMap((g) => g.items);
export const userNav: NavItem[] = userNavGroups.flatMap((g) => g.items);
