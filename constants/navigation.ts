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
  FileOutput,
  Copy,
  GitCompare,
  BarChart3,
  Building2,
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
  { title: "Transaktionen", href: `${prefix}/transactions`, icon: ArrowLeftRight },
  { title: "Mustererkennung", href: `${prefix}/patterns`, icon: Sparkles },
  { title: "Regelwerk", href: `${prefix}/rules`, icon: Scale },
  { title: "Kontenplan", href: `${prefix}/accounts`, icon: BookOpen },
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
