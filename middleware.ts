import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { role: string; sub: string };
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authToken = request.cookies.get('token')?.value;
  
  let userRole: string | undefined;

  // Verify token and extract role from payload if token exists
  if (authToken) {
    const payload = await verifyToken(authToken);
    userRole = payload?.role?.toLowerCase();
  }

  const dashboardPaths = Object.values(ROLE_DASHBOARD_MAP);
  const isSpecificDashboard = dashboardPaths.some((path) => pathname.startsWith(path));
  const isGenericDashboard = pathname === '/dashboard';

  // 1. Redirect to login if accessing any dashboard without a token
  if ((isSpecificDashboard || isGenericDashboard) && !authToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
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

  return NextResponse.next();
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