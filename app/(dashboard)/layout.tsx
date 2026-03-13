// app/(dashboard)/layout.tsx
// Dashboard layout - có sidebar + header

import { SidebarProvider } from "@/context/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MainLayoutWrapper } from "@/components/layout/main-layout-wrapper";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex">
          <Sidebar />
          <MainLayoutWrapper>
            {children}
          </MainLayoutWrapper>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
