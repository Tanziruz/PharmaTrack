import type { Metadata } from "next";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "PharmaTrack",
  description: "A pharma inventory management system built with Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Theme>
          <SidebarProvider>
            <AppSidebar />
            <main className="flex flex-1 flex-col min-h-svh w-full">
              <header className="flex h-14 items-center border-b px-4 gap-2">
                <SidebarTrigger />
                <span className="text-sm font-medium text-muted-foreground">PharmaTrack</span>
              </header>
              <div className="flex-1 p-6">
                {children}
              </div>
            </main>
          </SidebarProvider>
          <Toaster richColors position="top-right" />
        </Theme>
      </body>
    </html>
  );
}
