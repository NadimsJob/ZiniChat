import type { Metadata } from "next";
import { Outfit, Hind_Siliguri } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const hind = Hind_Siliguri({
  weight: ['300', '400', '500', '600', '700'],
  variable: "--font-hind",
  subsets: ["bengali"],
});

export const metadata: Metadata = {
  title: "ZiniChat | Omnichannel AI Business Assistant",
  description: "ZiniChat - Omnichannel AI Assistant Platform",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

import { ThemeProvider } from '@/components/ThemeProvider';
import { LanguageProvider } from '@/components/LanguageProvider';
import { CurrencyProvider } from '@/components/CurrencyProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${hind.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <LanguageProvider>
            <CurrencyProvider>
              {children}
            </CurrencyProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
