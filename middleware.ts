import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'experimental-edge';

// Mapping roles to their designated dashboard paths
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  super_admin: '/platform-master-hub',
  platform_master_hub: '/platform-master-hub',
  platform_master: '/platform-master-hub',
  admin: '/admin',
  host: '/host',
  support: '/support',
  customer: '/customer',
};

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Only handle access for the Platform Master Hub routes in this middleware
  if (!pathname.startsWith('/platform-master-hub')) {
    return NextResponse.next();
  }

  // Allow public pages (signup/login) to be served without an invite token.
  // These pages present the invitation flow and should remain public while
  // the dashboard and other protected routes remain guarded below.
  const PUBLIC_PATHS = [
    '/platform-master-hub/signup.html',
    '/platform-master-hub/signup',
    '/platform-master-hub/login',
    '/platform-master-hub/login.html'
  ];
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Accept token from query param `invite` or `token`, or from cookie `invite`/`token`
  const token =
    request.nextUrl.searchParams.get('invite') ||
    request.nextUrl.searchParams.get('token') ||
    request.cookies.get('invite')?.value ||
    request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Validate the token using the Supabase Edge Function `validate-invite-token`.
  // This requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to be set.
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    let isValid = false;
    // Prefer calling Supabase Edge Function when env vars are set
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const fnUrl = SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/validate-invite-token';
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        // Ask the function for a non-consuming check so the signup page can consume the invite
        body: JSON.stringify({ token, action: 'check' }),
      });

      if (res.ok) {
        const data = await res.json();
        isValid = !!(data && (data.valid || data.ok || data.isValid || data.tokenValid));
      }
    } else {
      // Fall back to local API route which can proxy to Supabase or perform local validation
      try {
        const origin = new URL(request.url).origin;
        const res = await fetch(origin + '/api/validate-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Use check mode to avoid consuming the one-time token at middleware time
          body: JSON.stringify({ token, action: 'check' }),
        });
        if (res.ok) {
          const data = await res.json();
          isValid = !!(data && (data.valid || data.ok || data.isValid || data.tokenValid));
        }
      } catch (e) {
        isValid = false;
      }
    }

    if (!isValid) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Set a short-lived, httpOnly cookie so subsequent requests don't need the query param.
    // Only mark the cookie `secure` in production to avoid local-dev HTTPS issues.
    const cookieOptions: any = { path: '/platform-master-hub', httpOnly: true, sameSite: 'lax', maxAge: 300 };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
    const nextResponse = NextResponse.next();
    nextResponse.cookies.set('invite', token, cookieOptions);
    return nextResponse;
  } catch (e) {
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    '/platform-master-hub/:path*'
  ],
};