
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// This is a basic middleware function.
// If you had authentication checks or other logic to run on edge requests,
// it would go here. Since the login system was removed, this middleware
// currently performs no specific operations.
export function middleware(request: NextRequest) {
  // Simply pass the request through.
  return NextResponse.next();
}

// Configure the matcher to specify which paths this middleware should run on.
// An empty array means it currently won't run on any specific paths by default
// unless other Next.js routing conventions trigger it.
// If you don't need any middleware functionality at all, you can also delete this file.
export const config = {
  matcher: [
    // Example: To run on all paths except API, static files, etc.
    // '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
