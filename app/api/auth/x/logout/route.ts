import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearSessionCookie } from '../../../../_lib/session';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  clearSessionCookie(cookieStore);

  // Get the return URL from query params (optional)
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('returnTo') || '/';
  const baseUrl = url.origin;

  // Redirect to X logout, then back to our app
  // This clears X's session cookies too
  const xLogoutUrl = `https://twitter.com/logout`;
  const finalRedirect = new URL(returnTo, baseUrl).toString();

  // Note: X doesn't support redirect_uri on logout, so we just redirect to home
  // User will need to manually log out of X if they want to switch accounts
  return NextResponse.redirect(new URL(returnTo, baseUrl));
}
