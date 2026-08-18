'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

interface AdminLoaderProps {
  message?: string;
  className?: string;
  rowCount?: number;
}

export default function AdminLoader({
  message,
  className = '',
  rowCount = 4
}: AdminLoaderProps) {
  const { language } = useLanguage();
  const defaultMsg = language === 'en' ? 'Loading data...' : 'তথ্য লোড হচ্ছে...';

  return (
    <div className={`p-8 text-center space-y-4 animate-in fade-in duration-300 ${className}`}>
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
        <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400 tracking-wide">
          {message || defaultMsg}
        </p>
      </div>

      {/* Pulsing Skeleton Rows Placeholder */}
      <div className="max-w-2xl mx-auto space-y-2 pt-2 opacity-60">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={i}
            className="h-9 bg-slate-100 dark:bg-surface-hover/40 border border-slate-200/60 dark:border-surface-hover rounded-xl animate-pulse flex items-center px-4 justify-between"
          >
            <div className="w-1/4 h-3 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
            <div className="w-1/3 h-3 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
            <div className="w-1/6 h-3 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
