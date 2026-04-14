export { default } from 'next-auth/middleware';

export const config = {
  // Protect all routes except public ones
  matcher: [
    '/((?!landing|login|api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
