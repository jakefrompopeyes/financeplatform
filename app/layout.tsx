import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/Toaster";
import { CommandPalette } from "@/components/CommandPalette";

const inter = Inter({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Stonkscan",
  description: "Real-time financial market analytics and insights | stonkscan.com",
  metadataBase: new URL("https://stonkscan.com"),
  openGraph: {
    title: "Stonkscan",
    description: "Real-time financial market analytics and insights",
    url: "https://stonkscan.com",
    siteName: "Stonkscan",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <div
            role="status"
            aria-label="This application is in beta"
            className="bg-amber-500/15 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-center py-2 px-4 text-sm font-medium border-b border-amber-500/30"
          >
            This app is in <strong>beta</strong> — features and data may change. We’d love your feedback.
          </div>
          {children}
          <Toaster />
          <CommandPalette />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}




