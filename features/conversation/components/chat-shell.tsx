"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/conversation/components/app-sidebar";

export function ChatShell({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider className="h-svh max-h-svh overflow-hidden">
            <AppSidebar />
            <SidebarInset className="h-svh max-h-svh overflow-hidden flex flex-col min-h-0">
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
