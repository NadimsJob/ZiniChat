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
  title: "ZiniChat | Best AI Chat, AI Chatbot & Chat Assistant Platform",
  description: "ZiniChat is the ultimate AI Chatbot and Chat Assistant for your business. Automate customer support with WhatsApp Official API, Meta API, and a 5 min setup. Start your free trial today!",
  keywords: [
    "chat", "ai chat", "ai chatbot", "chat assistent", "chat assistant", 
    "business chat", "customer support bot", "WhatsApp chatbot", 
    "ZiniChat", "omnichannel ai", "whatsapp official api", "meta api", 
    "5 min setup", "auto reply", "selling agent", "ai sales agent", 
    "automated customer support", "free trial", "try for free", "free ai chatbot",
    "ai chatbot bangladesh", "whatsapp auto reply bd", "facebook auto reply bd", "business automation bd",
    "এআই চ্যাটবট", "অটো রিপ্লাই", "চ্যাট এসিস্ট্যান্ট", "কাস্টমার সাপোর্ট", "বিজনেস চ্যাট"
  ],
  openGraph: {
    title: "ZiniChat | AI Chatbot & Chat Assistant",
    description: "Automate your business with the ultimate AI Chatbot and Chat Assistant. Fast replies 24/7 on WhatsApp, Messenger, and Instagram. 5 Min Setup. Try it for free!",
    url: "https://zinichat.com",
    siteName: "ZiniChat",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "ZiniChat AI Chatbot",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZiniChat | AI Chatbot & Chat Assistant",
    description: "Automate your business with the ultimate AI Chatbot and Chat Assistant.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

import { ThemeProvider } from '@/components/ThemeProvider';
import { LanguageProvider } from '@/components/LanguageProvider';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { MetaPixelProvider } from '@/context/MetaPixelContext';
import { GoogleAnalyticsProvider } from '@/context/GoogleAnalyticsContext';
import { ToastProvider } from '@/components/ToastProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${hind.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LanguageProvider>
            <CurrencyProvider>
              <MetaPixelProvider>
                <GoogleAnalyticsProvider>
                  <ToastProvider />
                  {children}
                </GoogleAnalyticsProvider>
              </MetaPixelProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
