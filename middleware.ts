// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // TODO: REMOVE BEFORE PRODUCTION - Test bypass for build loop
    // This allows testing without authentication during development
    const testBypass = req.headers.get('x-test-bypass')
    if (testBypass === 'build-loop-test-2026') {
      return NextResponse.next()
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      async authorized({ token, req }) {
        // TODO: REMOVE BEFORE PRODUCTION - Test bypass for build loop
        const testBypass = req.headers.get('x-test-bypass')
        if (testBypass === 'build-loop-test-2026') {
          return true
        }
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
