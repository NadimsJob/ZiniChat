'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

interface AdminPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export default function AdminPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = ''
}: AdminPaginationProps) {
  const { language } = useLanguage();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);

  // Generate page numbers array with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (safePage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-surface/80 border-t border-slate-200 dark:border-surface-hover text-xs font-medium text-slate-700 dark:text-zinc-300 transition-colors rounded-b-2xl ${className}`}>
      {/* Items Summary & Page Size selector */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div>
          {language === 'en' ? (
            <span>
              Showing <strong className="font-bold text-slate-900 dark:text-white">{startItem}</strong> to <strong className="font-bold text-slate-900 dark:text-white">{endItem}</strong> of <strong className="font-bold text-slate-900 dark:text-white">{totalItems}</strong> items
            </span>
          ) : (
            <span>
              মোট <strong className="font-bold text-slate-900 dark:text-white">{totalItems}</strong> টির মধ্যে <strong className="font-bold text-slate-900 dark:text-white">{startItem}</strong> থেকে <strong className="font-bold text-slate-900 dark:text-white">{endItem}</strong> টি দেখানো হচ্ছে
            </span>
          )}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
            <span className="text-[11px] text-slate-500 dark:text-zinc-400">
              {language === 'en' ? 'Per page:' : 'প্রতি পেজে:'}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1); // Reset to first page
              }}
              className="bg-slate-100 dark:bg-background border border-slate-300 dark:border-surface-hover text-slate-900 dark:text-white rounded-lg px-2 py-1 text-[11px] font-semibold focus:outline-none focus:border-primary cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          title={language === 'en' ? 'First Page' : 'প্রথম পেজ'}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-surface-hover bg-slate-50 dark:bg-background text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          title={language === 'en' ? 'Previous Page' : 'পূর্ববর্তী পেজ'}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-surface-hover bg-slate-50 dark:bg-background text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 px-2"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">{language === 'en' ? 'Prev' : 'আগের'}</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((num, idx) => {
            if (num === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 dark:text-zinc-500 font-bold">
                  …
                </span>
              );
            }

            const pageNum = num as number;
            const isActive = pageNum === safePage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20 border border-primary'
                    : 'bg-slate-50 dark:bg-background text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-surface-hover hover:bg-slate-100 dark:hover:bg-surface-hover hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          title={language === 'en' ? 'Next Page' : 'পরবর্তী পেজ'}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-surface-hover bg-slate-50 dark:bg-background text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 px-2"
        >
          <span className="hidden sm:inline text-[11px]">{language === 'en' ? 'Next' : 'পরের'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          title={language === 'en' ? 'Last Page' : 'শেষ পেজ'}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-surface-hover bg-slate-50 dark:bg-background text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
