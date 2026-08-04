"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { ReduxProvider } from "@/store/redux-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";

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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <RealtimeProvider>
              {children}
              <Toaster richColors position="top-right" />
            </RealtimeProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
