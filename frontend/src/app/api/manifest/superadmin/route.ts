import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: 'ZiniChat Admin',
    short_name: 'ZiniChat Admin',
    description: 'Superadmin Panel for ZiniChat',
    start_url: '/superadmin',
    scope: '/superadmin',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#121214', // Dark mode accent
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192 512x512',
        type: 'image/png'
      }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
