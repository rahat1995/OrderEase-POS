
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// This is a basic middleware for route protection.
// It checks for the presence of a Firebase Auth session cookie.
// More advanced role-based protection in middleware often requires custom claims in the ID token.

const ADMIN_PREFIX = '/admin';
const LOGIN_PATH = '/login';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieStore = cookies();

  // Attempt to find a cookie that Firebase Auth typically sets.
  // The exact name can vary or you might use a custom session cookie strategy.
  // Common Firebase Auth cookies might start with 'firebase' or be named '__session'.
  // For simplicity, we'll check for any cookie indicating a session.
  // A more robust check would involve verifying the ID token if using custom cookie strategy.
  const sessionCookie = cookieStore.getAll().find(cookie => 
    cookie.name.includes('firebase') || cookie.name.includes('session')
  );
  // Note: The default Firebase JS SDK uses IndexedDB for session persistence, not directly cookies accessible by middleware for token verification
  // without custom setup (e.g., server-side session cookies). This check is a basic heuristic.
  // A truly secure middleware would verify a JWT (e.g., Firebase ID token passed as a cookie).
  // For this iteration, we rely on client-side checks in AdminLayout for role-based access after Firebase JS SDK initializes.

  // If trying to access an admin route
  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!sessionCookie) { // A very basic check, not truly secure for role access
      // If no session cookie, redirect to login, preserving the intended path
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      url.searchParams.set('next', pathname); // Pass original path to redirect back after login
      return NextResponse.redirect(url);
    }
    // If session cookie exists, allow access. Role check will be client-side in AdminLayout.
  }

  // If accessing login page while a session cookie exists, redirect to home
  // This might be too aggressive if the session isn't fully validated yet.
  // if (pathname === LOGIN_PATH && sessionCookie) {
  //   return NextResponse.redirect(new URL('/', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
