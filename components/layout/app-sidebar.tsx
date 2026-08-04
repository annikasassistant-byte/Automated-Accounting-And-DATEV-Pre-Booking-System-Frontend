"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavGroup, NavItem } from "@/constants/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Layers } from "lucide-react";

function isNavActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/dashboard" && href !== "/admin/dashboard" && pathname.startsWith(href))
  );
}

function NavMenuItems({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={active}
              tooltip={item.title}
              render={<Link href={item.href} />}
              className={cn(
                "rounded-xl transition-all duration-200",
                active && "bg-primary/10 font-medium text-primary shadow-sm"
              )}
            >
              <item.icon strokeWidth={active ? 2 : 1.75} />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar({
  items,
  groups,
  label,
}: {
  items?: NavItem[];
  groups?: NavGroup[];
  label: string;
}) {
  const navGroups: NavGroup[] =
    groups && groups.length > 0 ? groups : [{ items: items || [] }];
  const firstHref = navGroups[0]?.items[0]?.href ?? "/";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/40 bg-sidebar/80 backdrop-blur-xl"
    >
      <SidebarHeader className="border-b border-border/30 px-4 py-5">
        <Link href={firstHref} className="flex items-center gap-3 font-semibold">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20">
            <Layers className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">Automated Accounting</span>
            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        {navGroups.map((group, idx) => (
          <SidebarGroup key={group.label || `group-${idx}`}>
            {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
            <SidebarGroupContent>
              <NavMenuItems items={group.items} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/30 p-4 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
        © 2026 Automated Accounting
      </SidebarFooter>
    </Sidebar>
  );
}

export function DashboardShell({
  sidebar,
  children,
  topbar,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  topbar: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset className="mesh-background min-h-screen">
        <header className="sticky top-0 z-30 flex h-[3.75rem] items-center gap-3 border-b border-border/40 bg-background/70 px-4 backdrop-blur-xl lg:px-8">
          <SidebarTrigger className="-ml-1 rounded-xl" />
          {topbar}
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-[1400px] space-y-8">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function pageTitleClass() {
  return cn("text-2xl font-semibold tracking-tight sm:text-3xl");
}
