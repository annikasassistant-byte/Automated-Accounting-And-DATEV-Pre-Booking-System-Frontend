import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Settings,
  User,
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

export const adminNavGroups: NavGroup[] = [
  {
    items: [
      { title: "Übersicht", href: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Benutzer", href: "/admin/users", icon: Users },
      { title: "Einstellungen", href: "/admin/settings", icon: Settings },
      { title: "Profil", href: "/admin/profile", icon: User },
    ],
  },
];

export const userNavGroups: NavGroup[] = [
  {
    items: [
      { title: "Übersicht", href: "/dashboard", icon: LayoutDashboard },
      { title: "Profil", href: "/dashboard/profile", icon: User },
      { title: "Einstellungen", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export const adminNav: NavItem[] = adminNavGroups.flatMap((g) => g.items);
export const userNav: NavItem[] = userNavGroups.flatMap((g) => g.items);
