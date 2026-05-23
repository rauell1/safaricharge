import { NextRequest, NextResponse } from 'next/server';
import { validateAdminToken } from '@/app/api/admin/auth/route';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes except the login/auth pages
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    const secret = process.env.ADMIN_SESSION_SECRET;
    const token = request.cookies.get('sc_admin_token')?.value ?? '';

    if (!secret || !validateAdminToken(token, secret)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin-login';
      loginUrl.search = '';
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
