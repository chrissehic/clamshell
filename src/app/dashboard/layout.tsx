import { PearlProvider } from "@/contexts/PearlContext";

export default function DashboardLayout({
  children,
}: Readonly<{
  children?: React.ReactNode;
}>) {
  return (
      <PearlProvider>
          <div className="h-screen flex w-full">
          {children}
          </div>
      </PearlProvider>
  );
}
