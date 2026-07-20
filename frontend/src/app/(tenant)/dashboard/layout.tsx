import { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import ServiceWorkerRegistry from '@/components/ServiceWorkerRegistry';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';

export const metadata: Metadata = {
  manifest: '/api/manifest/tenant',
};

export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceWorkerRegistry />
      <PwaInstallPrompt type="tenant" />
      <ClientLayout>{children}</ClientLayout>
    </>
  );
}
