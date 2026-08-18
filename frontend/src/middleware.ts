import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function parseJwtPayload(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenStructurallyValid(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return false;
  const isExpired = Date.now() >= payload.exp * 1000;
  return !isExpired;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect /sp@dmin routes
  if (path.startsWith('/sp@dmin') && path !== '/sp@dmin/login') {
    const token = request.cookies.get('access_token')?.value;
    let role = request.cookies.get('user_role')?.value;

    if (!token || !isTokenStructurallyValid(token)) {
      return NextResponse.redirect(new URL('/sp@dmin/login', request.url));
    }

    const payload = parseJwtPayload(token);
    if (!role && payload?.role) {
      role = payload.role;
    }

    if (role !== 'superadmin' && payload?.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/sp@dmin/login', request.url));
    }
  }

  // Protect /dashboard routes (Tenant)
  if (path.startsWith('/dashboard')) {
    const token = request.cookies.get('access_token')?.value;
    let role = request.cookies.get('user_role')?.value;

    if (!token || !isTokenStructurallyValid(token)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = parseJwtPayload(token);
    if (!role && payload?.role) {
      role = payload.role;
    }

    // A pure superadmin session should be in /sp@dmin, not tenant /dashboard
    if (role === 'superadmin') {
      return NextResponse.redirect(new URL('/sp@dmin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/sp@dmin/:path*', '/dashboard/:path*'],
};
