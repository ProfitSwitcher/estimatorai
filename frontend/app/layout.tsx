import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
