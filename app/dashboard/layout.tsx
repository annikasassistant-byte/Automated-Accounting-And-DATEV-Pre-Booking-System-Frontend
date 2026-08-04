"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppSidebar, DashboardShell } from "@/components/layout/app-sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { userNavGroups } from "@/constants/navigation";

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["user"]}>
      <DashboardShell
        sidebar={<AppSidebar groups={userNavGroups} label="Benutzerportal" />}
        topbar={<TopNavbar profileHref="/dashboard/profile" />}
      >
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
