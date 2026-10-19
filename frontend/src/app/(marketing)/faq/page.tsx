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
      name: 'What is Zini-Mail AI Cold Email Outreach?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Zini-Mail is an autonomous lead generation and cold outreach ecosystem that discovers verified B2B leads via SERP and flyer scanning, generates personalized email copy using Gemini AI, delivers safely via your own SMTP, and enables 1-click WhatsApp retargeting for high-intent clickers.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I retarget cold email clickers on WhatsApp?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! ZiniChat tracks email link clicks via secure redirect attribution and provides an automated "Clicked (No Order Yet)" audience filter so you can engage hot prospects directly on WhatsApp with a single click.',
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
