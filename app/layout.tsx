import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HRMS — Acme Corp",
  description: "Human Resource Management System with AI HR Copilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className} suppressHydrationWarning>
        <Script id="theme-loader" strategy="beforeInteractive">
          {`
            (function() {
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.className = theme;
              } catch (e) {}
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
