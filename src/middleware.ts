import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Exposes the current pathname to server components via the `x-pathname`
 * header (Next.js doesn't provide it otherwise). Used to give the homepage
 * its own layout while band pages keep the classic multi-column browser.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png).*)'],
};
