import { NextResponse } from 'next/server';

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000';
};

export async function GET() {
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/meta-pixel/config`, {
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
    console.error('Error fetching Meta Pixel config in API route:', err?.message);
    return NextResponse.json({ config: { isActive: false } }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendUrl = getBackendUrl();

    const res = await fetch(`${backendUrl}/meta-pixel/acquisition/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('Error proxying acquisition track event:', err?.message);
    return NextResponse.json({ success: false, message: err?.message }, { status: 200 });
  }
}
