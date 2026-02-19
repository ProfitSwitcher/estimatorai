// app/api/estimates/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { generateEstimate } from '@/lib/services/estimateAI'

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

    // Generate AI estimate
    const estimate = await generateEstimate({
      description,
      photos,
      projectType,
      location,
      pricingRules: user?.pricing_rules,
    })

    // Save to database
    const { data: saved, error } = await supabase
      .from('estimates')
      .insert({
        user_id: userId,
        project_title: estimate.projectTitle,
        description,
        line_items: estimate.lineItems,
        subtotal: estimate.subtotal,
        tax: estimate.tax,
        total: estimate.total,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      estimateId: saved.id,
      estimate,
    })
  } catch (error: any) {
    console.error('Error generating estimate:', error)
    return NextResponse.json(
      { error: 'Failed to generate estimate', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
