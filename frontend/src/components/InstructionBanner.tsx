'use client';

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';

interface InstructionBannerProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  variant?: 'emerald' | 'blue' | 'purple';
}

export default function InstructionBanner({ title, description, icon: Icon = Info, variant = 'emerald' }: InstructionBannerProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const colors = {
    emerald: {
      border: 'border-emerald-200/80',
      bg: 'bg-emerald-50/70',
      iconBg: 'bg-emerald-100 text-emerald-700',
      title: 'text-emerald-950',
      text: 'text-emerald-900',
      mobileBtn: 'bg-emerald-100/90 text-emerald-800 border-emerald-300/80 hover:bg-emerald-200/70',
    },
    blue: {
      border: 'border-blue-200/80',
      bg: 'bg-blue-50/70',
      iconBg: 'bg-blue-100 text-blue-700',
      title: 'text-blue-950',
      text: 'text-blue-900',
      mobileBtn: 'bg-blue-100/90 text-blue-800 border-blue-300/80 hover:bg-blue-200/70',
    },
    purple: {
      border: 'border-purple-200/80',
      bg: 'bg-purple-50/70',
      iconBg: 'bg-purple-100 text-purple-700',
      title: 'text-purple-950',
      text: 'text-purple-900',
      mobileBtn: 'bg-purple-100/90 text-purple-800 border-purple-300/80 hover:bg-purple-200/70',
    },
  }[variant];

  return (
    <div className="mb-3">
      {/* Mobile Toggle Button */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-[12px] font-semibold transition-all shadow-sm ${colors.mobileBtn}`}
        >
          <span className="flex items-center gap-2 truncate">
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{title}</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] font-bold shrink-0 ml-2">
            {isOpenMobile ? (
              <>
                <span>বন্ধ করুন</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>পড়ুন 📖</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </span>
        </button>

        {isOpenMobile && (
          <div className={`mt-1.5 p-3 rounded-xl border ${colors.border} ${colors.bg} text-[12px] ${colors.text} leading-relaxed animate-in fade-in zoom-in-95 duration-200 shadow-md`}>
            <p>{description}</p>
          </div>
        )}
      </div>

      {/* Desktop Full View */}
      <div className={`hidden md:flex items-start gap-3 p-3.5 rounded-xl border ${colors.border} ${colors.bg}`}>
        <div className={`p-2 rounded-lg shrink-0 ${colors.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className={`font-bold text-[13px] mb-0.5 ${colors.title}`}>{title}</h3>
          <p className={`text-[12px] leading-relaxed max-w-4xl ${colors.text}`}>{description}</p>
        </div>
      </div>
    </div>
  );
}
