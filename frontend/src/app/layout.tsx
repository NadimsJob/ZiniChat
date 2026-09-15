import type { Metadata } from "next";
import { Inter, Hind_Siliguri, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const hind = Hind_Siliguri({
  weight: ['300', '400', '500', '600', '700'],
  variable: "--font-hind",
  subsets: ["bengali"],
});

const notoBengali = Noto_Sans_Bengali({
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://zinichat.com'),
  title: {
    default: "ZiniChat | AI Chatbot & WhatsApp Automation Platform",
    template: "%s | ZiniChat"
  },
  description: "ZiniChat is the leading AI chatbot and WhatsApp automation platform for businesses worldwide. Automate customer support 24/7, manage omnichannel conversations on WhatsApp, Messenger, and Instagram, and close sales on autopilot. Set up in 5 minutes.",
  manifest: "/manifest.json",
  applicationName: "ZiniChat",
  authors: [{ name: "ZiniChat Team", url: "https://zinichat.com/about" }],
  generator: "Next.js",
  keywords: [
    "ai chatbot", "whatsapp chatbot", "whatsapp business api", "omnichannel inbox",
    "ai customer support", "business automation", "ai sales agent", "auto reply bot",
    "facebook messenger bot", "instagram dm automation", "chat assistant", "zinichat",
    "conversational ai", "whatsapp auto reply", "live chat widget", "customer service ai"
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ZiniChat | AI Chatbot & WhatsApp Automation Platform",
    description: "Automate customer support 24/7 on WhatsApp, Messenger & Instagram. Omnichannel AI assistant built for modern businesses worldwide. 5-minute setup.",
    url: "https://zinichat.com",
    siteName: "ZiniChat",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "ZiniChat AI Chatbot & WhatsApp Automation Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZiniChat | AI Chatbot & WhatsApp Automation Platform",
    description: "Automate customer support 24/7 on WhatsApp, Messenger & Instagram with AI.",
    images: ["/logo.png"],
    creator: "@zinichat",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { ThemeProvider } from '@/components/ThemeProvider';
import { LanguageProvider } from '@/components/LanguageProvider';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { MetaPixelProvider } from '@/context/MetaPixelContext';
import { GoogleAnalyticsProvider } from '@/context/GoogleAnalyticsContext';
import { ToastProvider } from '@/components/ToastProvider';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoBengali.variable} ${hind.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LanguageProvider>
            <CurrencyProvider>
              <MetaPixelProvider>
                <GoogleAnalyticsProvider>
                  <ToastProvider />
                  <ServiceWorkerRegister />
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

