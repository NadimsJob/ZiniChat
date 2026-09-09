import type { Metadata } from 'next';
import ContactPageContent from './ContactPageContent';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Contact ZiniChat — Support, Sales & Partnerships',
  description: 'Get in touch with ZiniChat sales and support team. Have questions about WhatsApp API integration, pricing plans, or custom enterprise solutions? Contact us today.',
  alternates: {
    canonical: 'https://zinichat.com/contact',
  },
  openGraph: {
    title: 'Contact ZiniChat — Sales & Support',
    description: 'We are here to help you automate customer support and grow your business.',
    url: 'https://zinichat.com/contact',
    siteName: 'ZiniChat',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'Contact ZiniChat' }],
  },
};

const contactPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact ZiniChat',
  url: 'https://zinichat.com/contact',
  mainEntity: {
    '@type': 'Organization',
    name: 'ZiniChat',
    email: 'info@zinichat.com',
    telephone: '+8801533894967',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '#386, Uttar Badda',
      addressLocality: 'Dhaka',
      postalCode: '1212',
      addressCountry: 'BD',
    },
  },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd data={contactPageSchema} />
      <ContactPageContent />
    </>
  );
}
