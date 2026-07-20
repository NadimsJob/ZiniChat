import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: 'ZiniChat Workspace',
    short_name: 'ZiniChat',
    description: 'Omnichannel AI Business Assistant',
    start_url: '/dashboard',
    scope: '/dashboard',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#1F824A', // Brand primary green
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
