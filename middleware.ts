import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Mapping roles to their designated dashboard paths
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  'super_admin': '/platform-master-hub',
  'platform_master_hub': '/platform-master-hub',
  'platform_master': '/platform-master-hub',
  'admin': '/admin',
  'host': '/host',
  'support': '/support',
  'customer': '/customer',
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 1. Initialize Supabase Client with Cookie Handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 2. Refresh the session if it exists
  // IMPORTANT: Do not use supabase.auth.getSession(), use getUser() for security
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('token')?.value || request.cookies.get('sb-access-token')?.value;
  
  // Extract role from Supabase user metadata or profile
  const userRole = (user?.app_metadata?.role || user?.user_metadata?.role || 'customer')?.toLowerCase();

  // If the user is logged in via Supabase but the legacy 'token' cookie is missing,
  // you can sync it here or rely entirely on the Supabase user object.
  const isLoggedIn = !!user;

  const dashboardPaths = Object.values(ROLE_DASHBOARD_MAP);
  const isSpecificDashboard = dashboardPaths.some((path) => pathname.startsWith(path));
  const isGenericDashboard = pathname === '/dashboard';
  const isAuthPage = pathname === '/login' || pathname === '/invite-signup';

  // 1. Redirect to login if accessing any dashboard without a token
  if ((isSpecificDashboard || isGenericDashboard) && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect logged-in users away from Auth pages
  if (isAuthPage && isLoggedIn && userRole) {
    const target = ROLE_DASHBOARD_MAP[userRole] || '/customer';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 2. Handle generic '/dashboard' route by redirecting to the role-specific one
  if (isGenericDashboard && userRole) {
    const target = ROLE_DASHBOARD_MAP[userRole] || '/customer';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 3. Prevent cross-role access (e.g., a host trying to access /admin)
  if (isSpecificDashboard && userRole) {
    const allowedPath = ROLE_DASHBOARD_MAP[userRole];

    if (allowedPath && !pathname.startsWith(allowedPath)) {
      return NextResponse.redirect(new URL(allowedPath, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard',
    '/platform-master-hub/:path*',
    '/admin/:path*',
    '/host/:path*',
    '/support/:path*',
    '/customer/:path*',
  ],
};