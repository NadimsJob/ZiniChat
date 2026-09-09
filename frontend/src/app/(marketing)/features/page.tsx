import type { Metadata } from 'next';
import FeaturesPageContent from './FeaturesPageContent';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'ZiniChat Features — AI WhatsApp Bot, Omnichannel Inbox & CRM',
  description: 'Explore ZiniChat full feature suite: AI-powered WhatsApp auto-reply, Meta Messenger, Instagram DM automation, Facebook comment auto-reply, website live chat widget, and built-in CRM.',
  alternates: {
    canonical: 'https://zinichat.com/features',
  },
  openGraph: {
    title: 'ZiniChat Features — AI-Powered Business Messaging',
    description: 'WhatsApp Official API, Messenger, Instagram DM, Live Chat, and AI Sales Assistant — all in one platform.',
    url: 'https://zinichat.com/features',
    siteName: 'ZiniChat',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'ZiniChat Features' }],
  },
};

const featuresPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ZiniChat Platform Features',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android, iOS',
  description: 'Comprehensive omnichannel AI customer messaging and sales automation features.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function FeaturesPage() {
  return (
    <>
      <JsonLd data={featuresPageSchema} />
      <FeaturesPageContent />
    </>
  );
}
