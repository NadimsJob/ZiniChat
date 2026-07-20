import { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import ServiceWorkerRegistry from '@/components/ServiceWorkerRegistry';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';

export const metadata: Metadata = {
  manifest: '/api/manifest/superadmin',
};

export default function SuperadminServerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceWorkerRegistry />
      <PwaInstallPrompt type="superadmin" />
      <ClientLayout>{children}</ClientLayout>
    </>
  );
}
