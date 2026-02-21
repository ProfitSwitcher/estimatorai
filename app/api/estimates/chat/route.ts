// app/api/estimates/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { handleEstimateConversation, Message, analyzePhotos, ModelTier } from '@/lib/services/estimateAI'

interface ChatRequest {
  estimateId?: string // If continuing existing estimate conversation
  message: string
  photos?: string[]
  conversationHistory?: Message[]
  modelTier?: ModelTier // 'fast' | 'pro' | 'expert'
}

// POST - Handle chat message in estimate conversation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body: ChatRequest = await req.json()

    if (!body.message || body.message.trim() === '') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check if user has company profile
    const { data: profile } = await supabase
      .from('company_profiles')
      .select('tax_rate')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        {
          error: 'Company profile not found',
          redirectTo: '/onboarding'
        },
        { status: 403 }
      )
    }

    const taxRate = profile.tax_rate || 0.08
    const modelTier = body.modelTier || 'pro'

    // Get conversation history
    let conversationHistory: Message[] = body.conversationHistory || []
    let estimateId = body.estimateId

    // If estimateId provided, fetch conversation from DB
    if (estimateId) {
      const { data: estimate } = await supabase
        .from('estimates')
        .select('conversation_state')
        .eq('id', estimateId)
        .eq('user_id', userId)
        .single()

      if (estimate && estimate.conversation_state) {
        conversationHistory = estimate.conversation_state as Message[]
      }
    }

    // Analyze photos if provided
    let photoContext = ''
    if (body.photos && body.photos.length > 0) {
      photoContext = await analyzePhotos(body.photos, modelTier)
    }

    // Build user message with photo context
    const userMessage = photoContext
      ? `${body.message}\n\n[Photo analysis: ${photoContext}]`
      : body.message

    // Handle conversation
    const response = await handleEstimateConversation(
      userId,
      conversationHistory,
      userMessage,
      taxRate,
      modelTier
    )

    // Update conversation history
    const updatedHistory: Message[] = [
      ...conversationHistory,
      { role: 'user', content: body.message },
      { role: 'assistant', content: response.message }
    ]

    // If estimate was generated, save/update in database
    if (response.isEstimate && response.estimate) {
      if (estimateId) {
        // Update existing estimate
        const { error: updateError } = await supabase
          .from('estimates')
          .update({
            project_title: response.estimate.projectTitle,
            description: response.estimate.summary,
            line_items: response.estimate.lineItems,
            subtotal: response.estimate.subtotal,
            tax: response.estimate.tax,
            total: response.estimate.total,
            assumptions: response.estimate.assumptions,
            recommendations: response.estimate.recommendations,
            timeline: response.estimate.timeline,
            conversation_state: updatedHistory,
            model_tier: modelTier,
            status: 'draft'
          })
          .eq('id', estimateId)
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error updating estimate:', updateError)
        }
      } else {
        // Create new estimate
        const { data: newEstimate, error: insertError } = await supabase
          .from('estimates')
          .insert({
            user_id: userId,
            project_title: response.estimate.projectTitle,
            description: response.estimate.summary,
            line_items: response.estimate.lineItems,
            subtotal: response.estimate.subtotal,
            tax: response.estimate.tax,
            total: response.estimate.total,
            assumptions: response.estimate.assumptions,
            recommendations: response.estimate.recommendations,
            timeline: response.estimate.timeline,
            conversation_state: updatedHistory,
            model_tier: modelTier,
            status: 'draft'
          })
          .select('id')
          .single()

        if (insertError) {
          console.error('Error creating estimate:', insertError)
        } else {
          estimateId = newEstimate.id
        }
      }
    } else if (estimateId) {
      // Just update conversation history for existing estimate
      const { error: updateError } = await supabase
        .from('estimates')
        .update({
          conversation_state: updatedHistory
        })
        .eq('id', estimateId)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating conversation:', updateError)
      }
    } else {
      // Create a placeholder estimate to track conversation
      const { data: newEstimate, error: insertError } = await supabase
        .from('estimates')
        .insert({
          user_id: userId,
          project_title: 'Draft Estimate',
          description: 'Estimate in progress...',
          line_items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          conversation_state: updatedHistory,
          status: 'draft'
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error creating draft estimate:', insertError)
      } else {
        estimateId = newEstimate.id
      }
    }

    return NextResponse.json(
      {
        message: response.message,
        isEstimate: response.isEstimate,
        estimate: response.estimate,
        needsMoreInfo: response.needsMoreInfo,
        estimateId,
        conversationHistory: updatedHistory
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/estimates/chat:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Retrieve conversation history for an estimate
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    const estimateId = searchParams.get('estimateId')

    if (!estimateId) {
      return NextResponse.json({ error: 'estimateId is required' }, { status: 400 })
    }

    const { data: estimate, error } = await supabase
      .from('estimates')
      .select('conversation_state, project_title')
      .eq('id', estimateId)
      .eq('user_id', userId)
      .single()

    if (error || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    return NextResponse.json(
      {
        estimateId,
        projectTitle: estimate.project_title,
        conversationHistory: estimate.conversation_state || []
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in GET /api/estimates/chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
