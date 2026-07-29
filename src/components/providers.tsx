"use client";

import { SessionProvider } from "next-auth/react";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <Toaster />
      </div>
    </SessionProvider>
  );
}
