import { NextResponse } from 'next/server';

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000';
};

export async function GET() {
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/google-analytics/config`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ config: { isActive: false } }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json({ config: data }, { status: 200 });
  } catch (err: any) {
    console.error('Error fetching Google Analytics config in API route:', err?.message);
    return NextResponse.json({ config: { isActive: false } }, { status: 200 });
  }
}
