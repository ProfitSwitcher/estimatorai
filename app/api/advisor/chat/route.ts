// app/api/advisor/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

type AdvisorTopic = 'playbook' | 'exit_strategy' | 'sops' | 'financial' | 'growth'

interface ChatRequest {
  conversationId?: string
  topic: AdvisorTopic
  message: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Anthropic client
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for Business Advisor')
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

/**
 * Build system prompts for each advisor topic
 */
function buildAdvisorSystemPrompt(topic: AdvisorTopic, companyProfile: any): string {
  const { company_name, trade, service_area_city, service_area_state, labor_rates, common_job_types, typical_crew_sizes } = companyProfile

  const location = [service_area_city, service_area_state].filter(Boolean).join(', ') || 'your area'
  const trades = Array.isArray(trade) ? trade.join(', ') : trade

  const baseContext = `Company: ${company_name}
Trade(s): ${trades}
Location: ${location}
Labor Rates: ${JSON.stringify(labor_rates)}
Common Job Types: ${common_job_types?.join(', ') || 'various'}
Crew Sizes: ${JSON.stringify(typical_crew_sizes)}`

  const prompts: Record<AdvisorTopic, string> = {
    playbook: `You are a senior construction business consultant. You're helping ${company_name}, a ${trades} contractor in ${location}, build a comprehensive business playbook.

${baseContext}

Your role is to help them document and systematize their entire business. Cover these areas:
- Company vision and mission
- Organizational structure
- Hiring and training processes
- Safety protocols and compliance
- Quality standards and processes
- Customer service approach
- Financial management
- Marketing and sales strategy

Ask thoughtful questions to understand their current state, then help them build each section systematically. Be specific to construction/trades, not generic business advice. 

Guide them through one section at a time. After each section is complete, offer to generate a written document they can save.`,

    exit_strategy: `You are an M&A advisor specializing in construction company valuations and exits. Help ${company_name} prepare their ${trades} business for sale.

${baseContext}

Focus on:
- Business valuation methods (SDE, EBITDA multiples for construction - typically 2-4x SDE for small contractors)
- Financial cleanup and documentation
- Reducing owner dependency
- Building recurring revenue and customer contracts
- Customer diversification (avoid concentration risk)
- Equipment and asset valuation
- License and bond transferability
- Building management systems and processes
- Finding the right buyer (competitor, private equity, industry roll-up)

Be realistic about construction company multiples and what buyers look for. Help them build enterprise value over the next 2-5 years.`,

    sops: `You are a construction operations expert. Help ${company_name} document their standard operating procedures for their ${trades} business.

${baseContext}

Focus on creating clear, actionable SOPs for:
- Job site setup and breakdown
- Safety protocols and daily safety talks
- Quality control checklists
- Customer communication (initial contact → completion → warranty)
- Estimating process and approval workflow
- Job scheduling and crew assignment
- Invoicing and payment collection
- Change order handling
- Warranty and callback procedures
- Equipment maintenance schedules
- Material ordering and tracking

Ask what processes they currently have (even informal ones) and help formalize them into step-by-step procedures their crew can follow. Make them practical and field-ready.`,

    financial: `You are a construction business financial analyst. Help ${company_name} understand and improve their financial health.

${baseContext}

Analyze and advise on:
- Profit margins by job type
- Labor cost ratios (should be 40-50% of revenue for most trades)
- Material cost management
- Overhead allocation and break-even analysis
- Cash flow management (the #1 killer of contractors)
- Pricing strategy and markup structure
- Job costing accuracy
- Financial KPIs (gross profit %, net profit %, revenue per employee)
- Seasonal cash planning
- Line of credit management

Ask for financial data to provide specific insights. Help them understand which jobs are actually profitable and where they're leaving money on the table.`,

    growth: `You are a construction business growth strategist. Help ${company_name} grow their ${trades} business in ${location}.

${baseContext}

Cover:
- Market analysis and opportunity identification
- Service expansion opportunities
- Marketing channels that work for contractors:
  * Referral programs and customer retention
  * Google Local Services Ads
  * Yard signs and truck wraps
  * Strategic partnerships with suppliers/builders
  * Online reviews and reputation management
- Hiring strategy and recruiting great people
- Geographic expansion (when and how)
- Commercial vs residential mix
- Recurring revenue models (maintenance contracts, service agreements)
- Technology and systems for scaling

Be practical - these are tradespeople building a business, not MBAs. Focus on strategies that actually work in the trades.`
  }

  return prompts[topic]
}

/**
 * Get topic display name
 */
function getTopicDisplayName(topic: AdvisorTopic): string {
  const names: Record<AdvisorTopic, string> = {
    playbook: 'Business Playbook',
    exit_strategy: 'Exit Strategy & Valuation',
    sops: 'SOPs & Documentation',
    financial: 'Financial Analysis',
    growth: 'Growth Strategy'
  }
  return names[topic]
}

// POST - Handle advisor chat message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body: ChatRequest = await req.json()

    if (!body.message || !body.topic) {
      return NextResponse.json(
        { error: 'message and topic are required' },
        { status: 400 }
      )
    }

    // Verify Anthropic API key
    try {
      getAnthropic()
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'Business Advisor requires Claude AI. Please add ANTHROPIC_API_KEY to your environment variables.',
          needsApiKey: true
        },
        { status: 503 }
      )
    }

    // Get company profile for context
    const { data: profile, error: profileError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Company profile not found. Please complete onboarding first.' },
        { status: 403 }
      )
    }

    // Get or create conversation
    let conversationId = body.conversationId
    let messages: Message[] = []

    if (conversationId) {
      // Load existing conversation
      const { data: conversation, error: convError } = await supabase
        .from('advisor_conversations')
        .select('messages')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single()

      if (convError || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      messages = conversation.messages as Message[]
    }

    // Build system prompt
    const systemPrompt = buildAdvisorSystemPrompt(body.topic, profile)

    // Add user message
    messages.push({ role: 'user', content: body.message })

    // Call Claude
    const anthropic = getAnthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    })

    const assistantMessage = response.content.find(c => c.type === 'text')
    const assistantContent = (assistantMessage as any)?.text || 'I apologize, but I encountered an error.'

    // Add assistant response
    messages.push({ role: 'assistant', content: assistantContent })

    // Save or update conversation
    if (conversationId) {
      // Update existing
      const { error: updateError } = await supabase
        .from('advisor_conversations')
        .update({
          messages,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating conversation:', updateError)
      }
    } else {
      // Create new
      const title = `${getTopicDisplayName(body.topic)} - ${new Date().toLocaleDateString()}`
      const { data: newConv, error: insertError } = await supabase
        .from('advisor_conversations')
        .insert({
          user_id: userId,
          topic: body.topic,
          title,
          messages
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error creating conversation:', insertError)
      } else {
        conversationId = newConv.id
      }
    }

    return NextResponse.json(
      {
        message: assistantContent,
        conversationId,
        messages
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/advisor/chat:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Retrieve advisor conversations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    const topic = searchParams.get('topic')

    if (conversationId) {
      // Get specific conversation
      const { data: conversation, error } = await supabase
        .from('advisor_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single()

      if (error || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      return NextResponse.json({ conversation }, { status: 200 })
    } else if (topic) {
      // Get all conversations for a topic
      const { data: conversations, error } = await supabase
        .from('advisor_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('topic', topic)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching conversations:', error)
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
      }

      return NextResponse.json({ conversations }, { status: 200 })
    } else {
      // Get all conversations
      const { data: conversations, error } = await supabase
        .from('advisor_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching conversations:', error)
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
      }

      return NextResponse.json({ conversations }, { status: 200 })
    }
  } catch (error: any) {
    console.error('Error in GET /api/advisor/chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
