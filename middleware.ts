// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  // The `!!session` will be a boolean indicating if a session exists.
  function middleware(req) {
    // You can customize the response here if needed
    // For example, redirect to a login page if not authenticated
    // if (!req.nextAuth.session) {
    //   return NextResponse.redirect('/login')
    // }
    // If you want to allow access to public pages even when authenticated,
    // add them to the unauthorized matcher below.
    return NextResponse.next()
  },
  {
    callbacks: {
      async authorized({ token, req }) {
        // `/admin` requires admin privileges
        return !!token // Only allow authenticated users
      },
    },
    // pages: {
    //   signIn: '/auth/signin', // Custom sign-in page
    //   error: '/auth/error', // Custom error page
    // },
    // unauthorized: '/auth/unauthorized', // Custom unauthorized page
    // The matcher will execute an additional check to see if the route is public.
    // If the route is public, the authorized callback won't be invoked.
    // matcher: ['/admin/:path*'],
  }
)

export const config = {
  // Matcher strings are relative to the root of the application.
  // Only protect routes that are not public.
  // This matcher protects most of the app, assuming the landing page (/) and login/register are public.
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any API routes that don't require authentication (e.g., public API endpoints)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|api/public).*)',
  ],
}
