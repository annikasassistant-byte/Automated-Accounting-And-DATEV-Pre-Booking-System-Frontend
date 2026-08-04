"use client";

import { Bell } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function NotificationDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative rounded-xl")}
        aria-label="Benachrichtigungen"
      >
        <Bell className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-xl">
        <DropdownMenuLabel>Benachrichtigungen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-muted-foreground">
          Noch keine Benachrichtigungen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
