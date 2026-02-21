// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token

    // Allow access to onboarding page without profile check
    if (req.nextUrl.pathname === '/onboarding') {
      return NextResponse.next()
    }

    // Check if user has completed onboarding (has company profile)
    if (token?.id) {
      const { data: profile } = await supabase
        .from('company_profiles')
        .select('id')
        .eq('user_id', token.id as string)
        .single()

      // If no profile exists and trying to access protected pages, redirect to onboarding
      if (!profile && (
        req.nextUrl.pathname.startsWith('/dashboard') ||
        req.nextUrl.pathname.startsWith('/estimate') ||
        req.nextUrl.pathname.startsWith('/phone') ||
        req.nextUrl.pathname.startsWith('/api/estimates')
      )) {
        const url = req.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    }

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
    '/dashboard/:path*',
    '/estimate/:path*',
    '/phone/:path*',
    '/onboarding',
    '/api/estimates/:path*',
    '/api/company-profile/:path*',
    '/api/phone-assistant/:path*',
    '/api/stripe/:path*',
  ],
}
