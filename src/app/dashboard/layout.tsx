import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ClerkProvider } from "@clerk/nextjs";
import { PearlProvider } from "@/contexts/PearlContext";

export default function DashboardLayout({
  children,
}: Readonly<{
  children?: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <PearlProvider>
        <SidebarProvider>
          <div className="h-screen flex w-full">
          <AppSidebar /> <SidebarInset>{children}</SidebarInset>
          </div>
        </SidebarProvider>
      </PearlProvider>
    </ClerkProvider>
  );
}
