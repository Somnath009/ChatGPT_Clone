"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/conversation/components/app-sidebar";

export function ChatShell({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-h-svh overflow-hidden flex flex-col">
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
