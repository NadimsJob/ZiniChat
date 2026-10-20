import type { Metadata } from 'next';
import FAQPageContent from './FAQPageContent';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'ZiniChat FAQ — Frequently Asked Questions About AI Chatbot & Cold Outreach',
  description: 'Find answers to common questions about ZiniChat — WhatsApp Business API setup, Zini-Mail autonomous cold email outreach, AI chatbot configuration, billing, and integrations.',
  alternates: {
    canonical: 'https://zinichat.com/faq',
  },
  openGraph: {
    title: 'ZiniChat FAQ — Everything You Need to Know',
    description: 'Get clear answers to all your questions about ZiniChat AI messaging, cold outreach, and automation platform.',
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
        text: 'ZiniChat is an AI-powered omnichannel messaging platform that automates customer support and sales on WhatsApp, Meta Messenger, Instagram DM, Facebook Comments, Website Chat, and Autonomous Cold Email Outreach.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is Zini-Mail AI Email Marketing and do I need my own email list?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Zini-Mail is a 100% automated AI email marketing system where you do NOT need your own email list or database. Simply specify your target business keywords and upload your promotional poster. AI searches Google and social pages to discover verified target emails, reads your offer poster using Vision AI, and safely dispatches personalized 1-on-1 marketing emails.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I retarget interested email clickers on WhatsApp?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! ZiniChat isolates high-intent leads who clicked your offer link as "Clicked (No Order Yet)" and allows you to initiate WhatsApp conversations with them in a single click.',
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
