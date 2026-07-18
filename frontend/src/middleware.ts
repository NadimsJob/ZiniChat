import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isTokenStructurallyValid(token: string): boolean {
  // A JWT must have exactly 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    // Decode and check expiry from the payload (no signature verification — that happens on the backend)
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    const isExpired = Date.now() >= payload.exp * 1000;
    return !isExpired;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect /superadmin routes
  if (path.startsWith('/superadmin') && path !== '/superadmin/login') {
    const token = request.cookies.get('access_token')?.value;
    const role = request.cookies.get('user_role')?.value;

    if (!token || !isTokenStructurallyValid(token) || role !== 'superadmin') {
      return NextResponse.redirect(new URL('/superadmin/login', request.url));
    }
  }

  // Protect /dashboard routes (Tenant)
  if (path.startsWith('/dashboard')) {
    const token = request.cookies.get('access_token')?.value;
    if (!token || !isTokenStructurallyValid(token)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/superadmin/:path*', '/dashboard/:path*'],
};
