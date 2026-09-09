import type { Metadata } from 'next';
import HomePageContent from './HomePageContent';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'ZiniChat — AI Chatbot & WhatsApp Automation Platform',
  description: 'ZiniChat is an AI-powered omnichannel chatbot platform. Automate customer support 24/7 on WhatsApp, Messenger, Instagram & Website Chat. No coding needed — set up in 5 minutes. Try free today.',
  alternates: {
    canonical: 'https://zinichat.com',
  },
  openGraph: {
    title: 'ZiniChat — AI Chatbot & WhatsApp Automation Platform',
    description: 'Automate customer support 24/7 on WhatsApp, Messenger, and Instagram. Multi-channel AI assistant for modern businesses worldwide.',
    url: 'https://zinichat.com',
    siteName: 'ZiniChat',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'ZiniChat AI Chatbot & WhatsApp Automation Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZiniChat — AI Chatbot & WhatsApp Automation Platform',
    description: 'Automate customer support 24/7 on WhatsApp, Messenger, and Instagram.',
    images: ['/logo.png'],
  },
};

const homePageSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://zinichat.com/#organization',
      name: 'ZiniChat',
      url: 'https://zinichat.com',
      logo: 'https://zinichat.com/logo.png',
      sameAs: [
        'https://facebook.com/zinichat',
        'https://linkedin.com/company/zinichat',
        'https://twitter.com/zinichat',
      ],
      description: 'Global AI-powered omnichannel customer support and messaging automation platform.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://zinichat.com/#website',
      url: 'https://zinichat.com',
      name: 'ZiniChat',
      publisher: {
        '@id': 'https://zinichat.com/#organization',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://zinichat.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://zinichat.com/#application',
      name: 'ZiniChat',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
      description: 'Omnichannel AI chatbot & WhatsApp automation SaaS platform.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '500',
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={homePageSchema} />
      <HomePageContent />
    </>
  );
}
