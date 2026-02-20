// app/api/estimates/generate/route.ts
export const maxDuration = 60 // Works on Pro; on Hobby falls back to 10s

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import OpenAI from 'openai'

// Lazy init OpenAI
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()
    const { description, photos, projectType, location } = body

    // Get user pricing rules
    const { data: user } = await supabase
      .from('users')
      .select('pricing_rules')
      .eq('id', userId)
      .single()

    const pricingRules = user?.pricing_rules || {}
    const laborRate = pricingRules.laborRates?.electrical || pricingRules.laborRate || 95
    const taxRate = pricingRules.taxRate || 0.08

    const systemPrompt = `You are an expert electrical contractor estimator. Output valid JSON only.
Keep response compact. Max 8 line items.
JSON format: {"projectTitle":"...","summary":"...","lineItems":[{"category":"Labor|Materials|Equipment|Permits","description":"...","quantity":0,"unit":"...","rate":0,"total":0}],"assumptions":["..."],"recommendations":["..."],"timeline":"..."}
Labor rate: $${laborRate}/hr. Always include "Estimate only; final pricing subject to site conditions." in assumptions.`

    const userPrompt = `Electrical estimate for: ${description}`

    // Stream the response to avoid Vercel timeout
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send a keepalive while waiting
          controller.enqueue(encoder.encode(' '))

          const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 1500,
          })

          const content = response.choices[0].message.content || '{}'
          const estimate = JSON.parse(content)

          // Calculate totals
          const subtotal = (estimate.lineItems || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0)
          const tax = subtotal * taxRate
          const total = subtotal + tax
          const fullEstimate = { ...estimate, subtotal, tax, total }

          // Save to database
          const { data: saved, error: dbError } = await supabase
            .from('estimates')
            .insert({
              user_id: userId,
              project_title: estimate.projectTitle || 'Untitled',
              description,
              project_type: projectType,
              location,
              line_items: estimate.lineItems,
              subtotal,
              tax,
              total,
              status: 'draft',
              assumptions: estimate.assumptions,
              recommendations: estimate.recommendations,
              timeline: estimate.timeline,
              photos: photos || null,
            })
            .select()
            .single()

          const result = JSON.stringify({
            success: true,
            estimateId: saved?.id || null,
            estimate: fullEstimate,
          })

          controller.enqueue(encoder.encode(result))
          controller.close()
        } catch (err: any) {
          const errResult = JSON.stringify({ error: err.message || 'Failed to generate estimate' })
          controller.enqueue(encoder.encode(errResult))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[Generate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate estimate', details: error?.message },
      { status: 500 }
    )
  }
}
