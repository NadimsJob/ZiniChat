'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdsAgentRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings/meta-ads');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-2 border-[#1F824A] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
