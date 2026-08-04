"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ReduxProvider } from "@/store/redux-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";
import { useAuthStore } from "@/lib/auth-store";
import { useAccountingStore } from "@/store/accounting-store";

function PersistHydration({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    void useAccountingStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ReduxProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={200}>
            <PersistHydration>
              <RealtimeProvider>{children}</RealtimeProvider>
              {/* Outside RealtimeProvider so socket auth churn never remounts portals */}
              <Toaster />
            </PersistHydration>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
