import type { Metadata } from 'next';
import FAQPageContent from './FAQPageContent';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'ZiniChat FAQ — Frequently Asked Questions About AI Chatbot',
  description: 'Find answers to common questions about ZiniChat — WhatsApp Business API setup, AI chatbot configuration, billing, integrations, and platform capabilities.',
  alternates: {
    canonical: 'https://zinichat.com/faq',
  },
  openGraph: {
    title: 'ZiniChat FAQ — Everything You Need to Know',
    description: 'Get clear answers to all your questions about ZiniChat AI messaging and automation platform.',
    url: 'https://zinichat.com/faq',
    siteName: 'ZiniChat',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'ZiniChat FAQ' }],
  },
};

const faqPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is ZiniChat?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'ZiniChat is an AI-powered omnichannel messaging platform that automates customer support and sales on WhatsApp, Meta Messenger, Instagram DM, Facebook Comments, and Website Chat.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does ZiniChat support WhatsApp Official API?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, ZiniChat seamlessly integrates with the Meta Official WhatsApp Cloud API as well as WhatsApp Web QR connect.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I start with a free trial?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! You can start a free trial with zero credit card required to experience AI auto-reply and automated customer service.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to set up ZiniChat?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Setup takes under 5 minutes. No technical or coding experience is required.',
      },
    },
  ],
};

export default function FAQPage() {
  return (
    <>
      <JsonLd data={faqPageSchema} />
      <FAQPageContent />
    </>
  );
}
