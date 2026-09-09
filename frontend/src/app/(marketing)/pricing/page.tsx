import type { Metadata } from 'next';
import PricingPageContent from './PricingPageContent';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'ZiniChat Pricing — AI Chatbot & WhatsApp Automation Plans',
  description: 'Transparent pricing plans for ZiniChat AI Chatbot. Choose from Free Trial, Starter, Growth, or Scale. Automate customer support on WhatsApp, Messenger & Instagram. Available in BDT and USD.',
  alternates: {
    canonical: 'https://zinichat.com/pricing',
  },
  openGraph: {
    title: 'ZiniChat Pricing — AI Chatbot Plans for Every Business',
    description: 'Flexible pricing from Free to Enterprise. Get AI WhatsApp automation, omnichannel inbox & automated sales tools. Start your free trial.',
    url: 'https://zinichat.com/pricing',
    siteName: 'ZiniChat',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'ZiniChat Pricing Plans' }],
  },
};

const pricingPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'ZiniChat AI Chatbot & WhatsApp Automation Subscription',
  description: 'AI customer support automation platform for WhatsApp, Messenger, and Instagram.',
  brand: {
    '@type': 'Brand',
    name: 'ZiniChat',
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'Free Plan',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: 'https://zinichat.com/pricing',
    },
    {
      '@type': 'Offer',
      name: 'Starter Plan',
      price: '9',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: 'https://zinichat.com/pricing',
    },
    {
      '@type': 'Offer',
      name: 'Growth Plan',
      price: '25',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: 'https://zinichat.com/pricing',
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <JsonLd data={pricingPageSchema} />
      <PricingPageContent />
    </>
  );
}
