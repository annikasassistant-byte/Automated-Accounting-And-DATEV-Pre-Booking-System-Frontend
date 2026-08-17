"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut, User } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/auth-store";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/lib/user-display";
import { useLogoutMutation } from "@/services/authApi";
import { hardNavigate } from "@/lib/hard-navigate";

export function TopNavbar({ profileHref }: { profileHref: string }) {
  const { user, logout } = useAuthStore();
  const { setTheme, resolvedTheme } = useTheme();
  const [logoutRequest] = useLogoutMutation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = getUserInitials(user?.name);
  const isDark = mounted && resolvedTheme === "dark";

  const handleLogout = async () => {
    try {
      await logoutRequest().unwrap();
    } catch {
      // Still clear local session if API logout fails
    } finally {
      logout();
      hardNavigate("/login", { replace: true });
    }
  };

  return (
    <div className="flex flex-1 items-center justify-between gap-4">
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-sm text-muted-foreground">
          Willkommen zurück,{" "}
          <span className="font-semibold text-foreground">{user?.name ?? "…"}</span>
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <NotificationDropdown />
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 min-h-11 min-w-11 rounded-xl"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Zum hellen Modus wechseln" : "Zum dunklen Modus wechseln"}
          suppressHydrationWarning
        >
          <Sun
            className={cn(
              "h-4 w-4 transition-all",
              !mounted ? "opacity-0" : isDark ? "scale-0 opacity-0" : "scale-100 opacity-100"
            )}
          />
          <Moon
            className={cn(
              "absolute h-4 w-4 transition-all",
              !mounted ? "opacity-0" : isDark ? "scale-100 opacity-100" : "scale-0 opacity-0"
            )}
          />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "relative h-11 w-11 min-h-11 min-w-11 rounded-full p-0"
            )}
            aria-label="Kontomenü"
          >
            <Avatar className="h-9 w-9 ring-2 ring-border/60 ring-offset-2 ring-offset-background">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => hardNavigate(profileHref)} className="rounded-lg">
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-lg text-destructive focus:text-destructive"
              onClick={() => void handleLogout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
