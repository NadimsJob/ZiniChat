import type { Metadata } from 'next';
import SuccessStoriesContent from './SuccessStoriesContent';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'ZiniChat Success Stories — Real Business Results with AI',
  description: 'Read real case studies and success stories of businesses using ZiniChat to increase sales, automate WhatsApp customer service, and reduce support overhead 24/7.',
  alternates: {
    canonical: 'https://zinichat.com/success-stories',
  },
  openGraph: {
    title: 'ZiniChat Success Stories — Proven ROI with AI Messaging',
    description: 'See how e-commerce, real estate, healthcare, and service businesses scale revenue with ZiniChat.',
    url: 'https://zinichat.com/success-stories',
    siteName: 'ZiniChat',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'ZiniChat Success Stories' }],
  },
};

const successStoriesSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'ZiniChat Platform',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '500',
    bestRating: '5',
    worstRating: '1',
  },
};

export default function SuccessStoriesPage() {
  return (
    <>
      <JsonLd data={successStoriesSchema} />
      <SuccessStoriesContent />
    </>
  );
}
