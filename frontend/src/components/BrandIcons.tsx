import React from 'react';

/**
 * 1. Official WhatsApp Full-Color SVG Badge Logo
 */
export function WhatsAppBadgeIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#25D366" />
      <path
        d="M34.9 13.1C32 10.2 28.1 8.6 24 8.6c-8.5 0-15.4 6.9-15.4 15.4 0 2.7.7 5.4 2.1 7.7L9 39l7.5-2c2.2 1.2 4.8 1.9 7.5 1.9 8.5 0 15.4-6.9 15.4-15.4 0-4.1-1.6-8-4.5-10.4zm-10.9 22.4c-2.3 0-4.6-.6-6.6-1.8l-.5-.3-4.9 1.3 1.3-4.8-.3-.5c-1.3-2.1-2-4.5-2-7 0-7.1 5.8-12.9 12.9-12.9 3.5 0 6.7 1.3 9.2 3.8 2.5 2.5 3.8 5.7 3.8 9.2 0 7.1-5.8 13-12.9 13zm7.1-9.7c-.4-.2-2.3-1.1-2.7-1.3-.4-.1-.7-.2-.9.2s-.9 1.3-1.2 1.5c-.2.2-.5.3-.9.1s-1.7-.6-3.2-1.9c-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.4.6-.7.2-.2.3-.4.4-.7.1-.2.1-.5 0-.7-.1-.2-.9-2.2-1.2-3-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1 .5-.4.4-1.4 1.4-1.4 3.4s1.4 3.9 1.6 4.2c.2.3 2.8 4.3 6.8 6 1 .4 1.8.7 2.4.9 1 .3 1.9.3 2.6.2.8-.1 2.3-1 2.7-1.9.3-.9.3-1.7.2-1.9-.1-.2-.4-.3-.8-.5z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * 2. Official Messenger Gradient SVG Badge Logo
 */
export function MessengerBadgeIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="messenger-badge-grad" x1="6.8" y1="41.2" x2="41.2" y2="6.8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0099FF" />
          <stop offset="60%" stopColor="#A033FF" />
          <stop offset="100%" stopColor="#FF5280" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#messenger-badge-grad)" />
      <path
        d="M24 10C16.3 10 10 15.7 10 22.8c0 4 1.9 7.6 5 9.9v4.8l4.5-2.5c1.4.4 2.9.6 4.5.6 7.7 0 14-5.7 14-12.8S31.7 10 24 10zm-1.8 16.5l-3.6-3.8-7 3.8 7.7-8.2 3.7 3.8 6.9-3.8-7.7 8.2z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * 3. Official Instagram Gradient SVG Badge Logo
 */
export function InstagramBadgeIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig-badge-grad" cx="15%" cy="100%" r="120%">
          <stop offset="0%" stopColor="#FFD600" />
          <stop offset="35%" stopColor="#FF0100" />
          <stop offset="60%" stopColor="#D800B1" />
          <stop offset="100%" stopColor="#405DE6" />
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#ig-badge-grad)" />
      <path
        d="M24 14c3.3 0 3.6 0 4.9.1 1.2.1 1.9.3 2.3.5.6.2 1 .5 1.4 1 .4.4.7.8 1 1.4.2.4.4 1.1.5 2.3.1 1.3.1 1.6.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.9-.5 2.3-.2.6-.5 1-1 1.4-.4.4-.8.7-1.4 1-.4.2-1.1.4-2.3.5-1.3.1-1.6.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.3-2.3-.5-.6-.2-1-.5-1.4-1-.4-.4-.7-.8-1-1.4-.2-.4-.4-1.1-.5-2.3C14 27.6 14 27.3 14 24s0-3.6.1-4.9c.1-1.2.3-1.9.5-2.3.2-.6.5-1 1-1.4.4-.4.8-.7 1.4-1 .4-.2 1.1-.4 2.3-.5C20.4 14 20.7 14 24 14zm0-2.5c-3.3 0-3.7 0-5 .1-1.3.1-2.2.3-3 .6-.8.3-1.5.7-2.2 1.4-.7.7-1.1 1.4-1.4 2.2-.3.8-.5 1.7-.6 3-.1 1.3-.1 1.7-.1 5s0 3.7.1 5c.1 1.3.3 2.2.6 3 .3.8.7 1.5 1.4 2.2.7.7 1.4 1.1 2.2 1.4.8.3 1.7.5 3 .6 1.3.1 1.7.1 5 .1s3.7 0 5-.1c1.3-.1 2.2-.3 3-.6.8-.3 1.5-.7 2.2-1.4.7-.7 1.1-1.4 1.4-2.2.3-.8.5-1.7.6-3 .1-1.3.1-1.7.1-5s0-3.7-.1-5c-.1-1.3-.3-2.2-.6-3-.3-.8-.7-1.5-1.4-2.2-.7-.7-1.4-1.1-2.2-1.4-.8-.3-1.7-.5-3-.6-1.3-.1-1.7-.1-5-.1zm0 7.3a5.2 5.2 0 100 10.4 5.2 5.2 0 000-10.4zm0 8.1a2.9 2.9 0 110-5.8 2.9 2.9 0 010 5.8zm6.6-9.6a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * 4. Official Facebook Blue SVG Badge Logo
 */
export function FacebookBadgeIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#1877F2" />
      <path
        d="M27.2 37.5V24.8h4.2l.6-4.9h-4.8v-3.1c0-1.4.4-2.4 2.4-2.4h2.6V10c-.5-.1-2-.2-3.8-.2-3.8 0-6.4 2.3-6.4 6.6v3.5h-4.2v4.9h4.2v12.7h5.2z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * 5. Facebook Comment Automation Badge SVG Logo
 */
export function FacebookCommentBadgeIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="24" cy="24" r="24" fill="#1877F2" />
        <path
          d="M24 11c-7.2 0-13 5.2-13 11.6 0 3.6 1.8 6.9 4.7 9.1v4.3l4.1-2.3c1.3.4 2.7.5 4.2.5 7.2 0 13-5.2 13-11.6S31.2 11 24 11zm-1 15.5h-6v-2h6v2zm6-4h-12v-2h12v2zm0-4h-12v-2h12v2z"
          fill="#FFFFFF"
        />
      </svg>
      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center text-[7px] font-black text-black">
        ⚡
      </div>
    </div>
  );
}

/**
 * 6. Website Live Chat Widget Badge SVG Logo
 */
export function WebChatBadgeIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="webchat-badge-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#webchat-badge-grad)" />
      <path
        d="M14 16c0-2.2 1.8-4 4-4h12c2.2 0 4 1.8 4 4v10c0 2.2-1.8 4-4 4h-7l-5 4v-4h-0c-2.2 0-4-1.8-4-4V16zm5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * 7. Official Meta Infinity Badge/Logo SVG
 */
export function MetaLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M370.2 128c-34.7 0-66.2 15.6-88.2 41.2L256 199.6l-26-30.4C208 143.6 176.5 128 141.8 128 78.4 128 27 179.4 27 242.8c0 63.4 51.4 114.8 114.8 114.8 34.7 0 66.2-15.6 88.2-41.2l26-30.4 26 30.4c22 25.6 53.5 41.2 88.2 41.2 63.4 0 114.8-51.4 114.8-114.8C485 179.4 433.6 128 370.2 128zm-228.4 179c-35.3 0-64-28.7-64-64.2s28.7-64.2 64-64.2c20.3 0 38.6 9.4 50.7 24.3l.5.6-51.2 59.8h-.1zm228.4 0c-20.3 0-38.6-9.4-50.7-24.3l-.5-.6 51.2-59.8h.1c35.3 0 64 28.7 64 64.2s-28.7 64.2-64.1 64.2z"
        fill="#0668E1"
      />
    </svg>
  );
}

/**
 * Universal Channel Icon helper that resolves the authentic brand icon based on channel string.
 */
export function ChannelBrandIcon({ channelType, className = 'w-8 h-8' }: { channelType: string; className?: string }) {
  const type = (channelType || '').toLowerCase();

  if (type.includes('whatsapp') || type === 'wa') {
    return <WhatsAppBadgeIcon className={className} />;
  }
  if (type.includes('instagram') || type === 'ig') {
    return <InstagramBadgeIcon className={className} />;
  }
  if (type.includes('comment') || type === 'cmt') {
    return <FacebookCommentBadgeIcon className={className} />;
  }
  if (type.includes('messenger') || type.includes('facebook') || type === 'fb') {
    return <MessengerBadgeIcon className={className} />;
  }
  if (type.includes('website') || type.includes('web') || type === 'widget') {
    return <WebChatBadgeIcon className={className} />;
  }

  return <MetaLogo className={className} />;
}
