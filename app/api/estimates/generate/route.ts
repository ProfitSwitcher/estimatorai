// app/api/estimates/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { generateEstimate } from '@/lib/services/estimateAI'

export async function POST(req: NextRequest) {
  try {
    console.log('[Generate] Starting estimate generation...')
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log('[Generate] No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    console.log('[Generate] User ID:', userId)
    
    const body = await req.json()
    const { description, photos, projectType, location } = body
    console.log('[Generate] Request body:', { description: description?.substring(0, 100), photos: photos?.length || 0, projectType, location })

    // Get user pricing rules
    console.log('[Generate] Fetching user pricing rules...')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('pricing_rules')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('[Generate] Error fetching user:', userError)
      throw new Error(`Failed to fetch user: ${userError.message}`)
    }
    console.log('[Generate] User pricing rules:', user?.pricing_rules)

    // Generate AI estimate
    console.log('[Generate] Calling OpenAI...')
    const estimate = await generateEstimate({
      description,
      photos,
      projectType,
      location,
      pricingRules: user?.pricing_rules,
    })
    console.log('[Generate] AI estimate generated:', { 
      projectTitle: estimate.projectTitle, 
      lineItemsCount: estimate.lineItems?.length,
      total: estimate.total 
    })

    // Save to database
    console.log('[Generate] Saving to database...')
    const { data: saved, error } = await supabase
      .from('estimates')
      .insert({
        user_id: userId,
        project_title: estimate.projectTitle,
        description,
        project_type: projectType,
        location,
        line_items: estimate.lineItems,
        subtotal: estimate.subtotal,
        tax: estimate.tax,
        total: estimate.total,
        status: 'draft',
        assumptions: estimate.assumptions,
        recommendations: estimate.recommendations,
        timeline: estimate.timeline,
        photos: photos || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[Generate] Database error:', error)
      throw new Error(`Database error: ${error.message}`)
    }
    
    console.log('[Generate] Estimate saved successfully, ID:', saved.id)

    return NextResponse.json({
      success: true,
      estimateId: saved.id,
      estimate,
    })
  } catch (error: any) {
    console.error('[Generate] Error generating estimate:', error)
    console.error('[Generate] Stack trace:', error.stack)
    return NextResponse.json(
      { error: 'Failed to generate estimate', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
