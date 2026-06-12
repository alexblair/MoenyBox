import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import NavBar from "@/components/NavBar";
import CommandPalette from "@/components/command-palette";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import PwaRegister from "@/components/PwaRegister";

const inter = localFont({
  src: "../../public/fonts/inter/Inter-latin.woff2",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MoneyBox - 个人记账",
  description: "个人消费记录工具",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MoneyBox",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <CommandPalette />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex flex-col min-h-screen md:flex-row">
            {/* Mobile header */}
            <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 md:hidden">
              <h1 className="text-lg font-semibold">MoneyBox</h1>
            </header>

            <NavBar />

            {/* Main content */}
            <main className="flex-1 px-4 pb-24 md:pb-6 md:pt-6 md:max-w-4xl md:mx-auto md:w-full">
              {children}
            </main>
          </div>
        </ThemeProvider>
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}
