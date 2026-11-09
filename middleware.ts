import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { isPublicPath } from '@/lib/public-paths';

export async function middleware(request: NextRequest) {
    // Marketing, public ticker and comparison pages, robots.txt and sitemap.xml.
    // The signed-in app (/stocks, /dashboard, /watchlist, /profile) still requires a session cookie.
    if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();

    const sessionCookie = getSessionCookie(request);

    // Check cookie presence - prevents obviously unauthorized users
    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    return NextResponse.next();
}

// Only the signed-in app. Running on every public page, prefetch and crawler hit was a paid invocation each,
// and app/(root)/layout.tsx checks the session anyway. A new private route needs adding here.
export const config = {
    matcher: ['/dashboard/:path*', '/watchlist/:path*', '/profile/:path*', '/stocks/:path*'],
};
