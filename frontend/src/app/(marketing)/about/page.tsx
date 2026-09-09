import type { Metadata } from 'next';
import AboutPageContent from './AboutPageContent';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'About ZiniChat — The AI Business Communication Platform',
  description: 'ZiniChat is an AI-powered omnichannel communication platform helping businesses worldwide automate customer conversations at scale. Learn about our mission, team, and technology.',
  alternates: {
    canonical: 'https://zinichat.com/about',
  },
  openGraph: {
    title: 'About ZiniChat — Built for Modern Businesses Worldwide',
    description: 'Our mission is to democratize AI business automation — making it accessible, affordable, and effective for every business.',
    url: 'https://zinichat.com/about',
    siteName: 'ZiniChat',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'About ZiniChat' }],
  },
};

const aboutPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About ZiniChat',
  url: 'https://zinichat.com/about',
  mainEntity: {
    '@type': 'Organization',
    name: 'ZiniChat',
    url: 'https://zinichat.com',
    logo: 'https://zinichat.com/logo.png',
    description: 'Omnichannel AI customer assistant and WhatsApp automation platform.',
  },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd data={aboutPageSchema} />
      <AboutPageContent />
    </>
  );
}
