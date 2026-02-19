// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      async authorized({ token }) {
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    // Protect server-side routes only — client pages handle their own auth redirects
    '/dashboard/:path*',
    '/api/estimates/:path*',
    '/api/stripe/:path*',
  ],
}
