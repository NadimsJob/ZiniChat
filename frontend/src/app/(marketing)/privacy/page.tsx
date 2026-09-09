import type { Metadata } from 'next';
import PrivacyPageContent from './PrivacyPageContent';

export const metadata: Metadata = {
  title: 'Privacy Policy — ZiniChat',
  description: 'Read the official ZiniChat Privacy Policy. Learn how we collect, process, and protect your business and customer data.',
  alternates: {
    canonical: 'https://zinichat.com/privacy',
  },
  openGraph: {
    title: 'Privacy Policy — ZiniChat',
    description: 'Our commitment to data privacy, protection, and security.',
    url: 'https://zinichat.com/privacy',
    siteName: 'ZiniChat',
  },
};

export default function PrivacyPage() {
  return <PrivacyPageContent />;
}
