import { NextResponse } from 'next/server'

export async function GET() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const keyPrefix = process.env.OPENAI_API_KEY?.substring(0, 10) || 'NOT SET'
  const hasDB = !!process.env.DATABASE_URL
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  
  return NextResponse.json({
    openai: hasOpenAI,
    keyPrefix,
    database: hasDB,
    supabase: hasSupabase,
    nodeEnv: process.env.NODE_ENV,
  })
}
