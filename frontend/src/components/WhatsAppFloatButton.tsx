'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface WhatsappWidgetConfig {
  enabled: boolean;
  phoneNumber: string;
  buttonColor: string;
  customIconUrl: string | null;
  prefilledText: string;
  position: 'bottom-right' | 'bottom-left';
  tooltipTextEn: string;
  tooltipTextBn: string;
}

export default function WhatsAppFloatButton() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const [config, setConfig] = useState<WhatsappWidgetConfig | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetch(`${API}/landing-page/config`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch widget config');
      })
      .then(data => {
        if (data && data.whatsappWidgetJson) {
          setConfig(data.whatsappWidgetJson);
        } else {
          // Fallback default config
          setConfig({
            enabled: true,
            phoneNumber: '8801533894967',
            buttonColor: '#1F824A',
            customIconUrl: null,
            prefilledText: '',
            position: 'bottom-right',
            tooltipTextEn: 'Chat with us on WhatsApp',
            tooltipTextBn: 'হোয়াটসঅ্যাপে চ্যাট করুন',
          });
        }
      })
      .catch(() => {
        // Fallback default config on network error
        setConfig({
          enabled: true,
          phoneNumber: '8801533894967',
          buttonColor: '#1F824A',
          customIconUrl: null,
          prefilledText: '',
          position: 'bottom-right',
          tooltipTextEn: 'Chat with us on WhatsApp',
          tooltipTextBn: 'হোয়াটসঅ্যাপে চ্যাট করুন',
        });
      });
  }, []);

  // Show tooltip after 3 seconds to catch user attention
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Do not show on Superadmin or Tenant Dashboard pages
  if (!pathname || pathname.startsWith('/sp@dmin') || pathname.startsWith('/dashboard')) {
    return null;
  }

  // Do not show if disabled or not yet loaded
  if (!config || !config.enabled) {
    return null;
  }

  // Clean phone number (strip spaces, +, -, etc.)
  let cleanPhone = (config.phoneNumber || '8801533894967').replace(/[\s\-\+\(\)]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '88' + cleanPhone;
  }

  let waUrl = `https://wa.me/${cleanPhone}`;
  if (config.prefilledText) {
    waUrl += `?text=${encodeURIComponent(config.prefilledText)}`;
  }

  const tooltipText = language === 'bn' 
    ? (config.tooltipTextBn || 'হোয়াটসঅ্যাপে চ্যাট করুন')
    : (config.tooltipTextEn || 'Chat with us on WhatsApp');

  const positionClass = config.position === 'bottom-left' 
    ? 'left-5 sm:left-7' 
    : 'right-5 sm:right-7';

  return (
    <div
      className={`fixed bottom-5 sm:bottom-7 ${positionClass} z-50 flex items-center gap-3 transition-all duration-300`}
      onMouseEnter={() => setShowTooltip(true)}
    >
      {/* Tooltip Bubble */}
      {showTooltip && (
        <div className="hidden sm:flex items-center gap-2 bg-zinc-900/95 text-white text-xs font-medium px-3.5 py-2 rounded-xl shadow-2xl border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-300">
          <span>{tooltipText}</span>
          <button
            onClick={e => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="ml-1 text-zinc-400 hover:text-white text-xs"
            aria-label="Close tooltip"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="group relative flex items-center justify-center w-14 h-14 rounded-full text-white shadow-2xl transition transform hover:scale-110 active:scale-95 focus:outline-none"
        style={{ backgroundColor: config.buttonColor || '#1F824A' }}
      >
        {/* Animated Pulse Ring */}
        <span
          className="absolute -inset-1 rounded-full opacity-35 animate-ping pointer-events-none"
          style={{ backgroundColor: config.buttonColor || '#1F824A' }}
        />

        {/* Custom Uploaded Icon OR Default WhatsApp Vector */}
        {config.customIconUrl ? (
          <img
            src={`${API}${config.customIconUrl}`}
            alt="WhatsApp"
            className="w-7 h-7 object-contain rounded-full relative z-10"
          />
        ) : (
          <svg className="w-7 h-7 fill-current relative z-10 transition group-hover:scale-105" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
        )}
      </a>
    </div>
  );
}
