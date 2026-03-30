import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Logout Route Handler
 * Clears the session cookies used by Middleware and redirects to the login page.
 */
export async function GET(request: Request) {
  const cookieStore = cookies();

  // Remove cookies to invalidate the server-side session
  cookieStore.delete('token');
  cookieStore.delete('user-role');

  // Redirect the user to the login page
  return NextResponse.redirect(new URL('/login', request.url));
}