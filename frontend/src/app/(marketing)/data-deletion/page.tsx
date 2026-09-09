import type { Metadata } from 'next';
import DataDeletionPageContent from './DataDeletionPageContent';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions — ZiniChat',
  description: 'Instructions on how to request the deletion of your account and personal data from ZiniChat platform.',
  alternates: {
    canonical: 'https://zinichat.com/data-deletion',
  },
  openGraph: {
    title: 'Data Deletion Instructions — ZiniChat',
    description: 'Guidelines for requesting account and data removal.',
    url: 'https://zinichat.com/data-deletion',
    siteName: 'ZiniChat',
  },
};

export default function DataDeletionPage() {
  return <DataDeletionPageContent />;
}
