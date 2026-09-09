import type { Metadata } from 'next';
import TermsPageContent from './TermsPageContent';

export const metadata: Metadata = {
  title: 'Terms & Conditions — ZiniChat',
  description: 'Read ZiniChat Terms and Conditions regarding service usage, user agreements, subscriptions, and platform rules.',
  alternates: {
    canonical: 'https://zinichat.com/terms',
  },
  openGraph: {
    title: 'Terms & Conditions — ZiniChat',
    description: 'Service usage rules and user agreements for ZiniChat platform.',
    url: 'https://zinichat.com/terms',
    siteName: 'ZiniChat',
  },
};

export default function TermsPage() {
  return <TermsPageContent />;
}
