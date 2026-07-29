import { NextResponse } from 'next/server';

const getBackendUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000';
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendUrl = getBackendUrl();

    const res = await fetch(`${backendUrl}/google-analytics/acquisition/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('Error proxying GA acquisition track event:', err?.message);
    return NextResponse.json({ success: false, message: err?.message }, { status: 200 });
  }
}
