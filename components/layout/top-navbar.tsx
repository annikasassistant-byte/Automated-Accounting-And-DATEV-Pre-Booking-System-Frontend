"use client";

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
import { useRouter } from "next/navigation";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/lib/user-display";
import { useLogoutMutation } from "@/services/authApi";

export function TopNavbar({ profileHref }: { profileHref: string }) {
  const { user, logout } = useAuthStore();
  const { setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [logoutRequest] = useLogoutMutation();

  const initials = getUserInitials(user?.name);
  const isDark = resolvedTheme === "dark";

  const handleLogout = async () => {
    try {
      await logoutRequest().unwrap();
    } catch {
      // Still clear local session if API logout fails
    } finally {
      logout();
      router.replace("/login");
    }
  };

  return (
    <div className="flex flex-1 items-center justify-between gap-4">
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-sm text-muted-foreground">
          Willkommen zurück,{" "}
          <span className="font-semibold text-foreground">{user?.name}</span>
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <NotificationDropdown />
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Zum hellen Modus wechseln" : "Zum dunklen Modus wechseln"}
        >
          <Sun
            className={`h-4 w-4 transition-all ${isDark ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
          />
          <Moon
            className={`absolute h-4 w-4 transition-all ${isDark ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
          />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "relative h-9 w-9 rounded-full p-0"
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
            <DropdownMenuItem onClick={() => router.push(profileHref)} className="rounded-lg">
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
