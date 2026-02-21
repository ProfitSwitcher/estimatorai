import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import Nav from '@/components/nav'

export const metadata: Metadata = {
  title: 'EstimatorAI - AI-Powered Construction Estimating',
  description: 'Generate accurate construction estimates in minutes with AI-powered analysis of photos and project descriptions.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  )
}
