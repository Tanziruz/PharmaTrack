import type { Metadata } from "next";
import "./globals.css";
import {Theme} from "@radix-ui/themes";

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
          {children}
          </Theme>
      </body>
    </html>
  );
}
