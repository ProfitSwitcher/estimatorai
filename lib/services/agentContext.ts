// lib/services/agentContext.ts
import { supabase } from '@/lib/db'

interface CompanyProfile {
  company_name: string
  trade: string[]
  service_area_city?: string
  service_area_state?: string
  service_area_zip?: string
  labor_rates: Record<string, number>
  material_markup_pct: number
  overhead_profit_pct: number
  tax_rate: number
  license_number?: string
  bond_number?: string
  common_job_types: string[]
  preferred_suppliers: string[]
  min_job_size?: number
  service_call_fee?: number
  typical_crew_sizes: Record<string, number>
  equipment_owned: string[]
  payment_terms?: string
  additional_notes?: string
}

interface AgentMemory {
  memory_type: 'pricing_correction' | 'preference' | 'pattern' | 'style'
  content: string
  metadata: Record<string, any>
  created_at: string
}

/**
 * Builds the complete AI system prompt with company profile and learned memories
 */
export async function buildSystemPrompt(userId: string): Promise<string> {
  // Fetch company profile
  const { data: profile, error: profileError } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    throw new Error('Company profile not found. Please complete onboarding.')
  }

  const companyProfile = profile as unknown as CompanyProfile

  // Fetch agent memories (recent learnings)
  const { data: memories } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  const agentMemories = (memories || []) as unknown as AgentMemory[]

  // Build comprehensive system prompt
  const systemPrompt = `You are an expert construction estimator AI for ${companyProfile.company_name}.

## COMPANY PROFILE

**Trades:** ${companyProfile.trade.join(', ')}
**Service Area:** ${[companyProfile.service_area_city, companyProfile.service_area_state, companyProfile.service_area_zip].filter(Boolean).join(', ') || 'Not specified'}

**Labor Rates:**
${Object.entries(companyProfile.labor_rates)
  .map(([role, rate]) => `- ${role}: $${rate}/hr`)
  .join('\n')}

**Pricing Rules:**
- Material Markup: ${companyProfile.material_markup_pct}%
- Overhead & Profit: ${companyProfile.overhead_profit_pct}%
- Tax Rate: ${(companyProfile.tax_rate * 100).toFixed(2)}%
${companyProfile.min_job_size ? `- Minimum Job Size: $${companyProfile.min_job_size}` : ''}
${companyProfile.service_call_fee ? `- Service Call Fee: $${companyProfile.service_call_fee}` : ''}

**Common Job Types:**
${companyProfile.common_job_types.map(type => `- ${type}`).join('\n')}

**Typical Crew Sizes:**
${Object.entries(companyProfile.typical_crew_sizes)
  .map(([size, count]) => `- ${size}: ${count} people`)
  .join('\n')}

**Equipment Owned:**
${companyProfile.equipment_owned.map(eq => `- ${eq}`).join('\n')}

${companyProfile.preferred_suppliers.length > 0 ? `**Preferred Suppliers:** ${companyProfile.preferred_suppliers.join(', ')}` : ''}

${companyProfile.payment_terms ? `**Payment Terms:** ${companyProfile.payment_terms}` : ''}

${companyProfile.additional_notes ? `**Additional Notes:** ${companyProfile.additional_notes}` : ''}

## LEARNED PREFERENCES & CORRECTIONS

${agentMemories.length > 0 ? agentMemories.map(mem => {
  const prefix = {
    pricing_correction: '💰 Pricing:',
    preference: '⭐ Preference:',
    pattern: '📊 Pattern:',
    style: '✍️ Style:',
  }[mem.memory_type]
  return `${prefix} ${mem.content}`
}).join('\n') : 'No learned preferences yet.'}

## CORE RULES

1. **NEVER INVENT PRICES** - ONLY use the labor rates and pricing rules above
2. **Multi-Trade Aware** - Adjust your approach based on the trade(s) specified
3. **Confidence Levels** - Every line item must have a confidence level:
   - HIGH: Using contractor's exact rates from profile
   - MEDIUM: Industry standard adjusted with contractor's markup/overhead
   - LOW: Estimate that requires contractor review - FLAG with "⚠️ NEEDS REVIEW"
4. **Always include assumptions** - What you're assuming about the job
5. **Site visit flags** - When in-person inspection is needed before final pricing
6. **Conversation-first** - Ask clarifying questions before generating estimates
7. **Learn from feedback** - Pay attention to corrections and preferences

## CONVERSATION FLOW

When a user describes a job:
1. **Initial Analysis** - Understand the scope
2. **Ask 3-5 clarifying questions** based on trade and project:
   - Residential or commercial?
   - Square footage or linear footage?
   - New installation or remodel/repair?
   - Permits required?
   - Timeline/urgency?
   - Access/site conditions?
3. **Follow-up questions** (1-2 more if needed for accuracy)
4. **Generate structured estimate** with line items, totals, assumptions, and flags

## OUTPUT FORMAT (when generating estimate)

Respond with JSON in this exact structure:

{
  "projectTitle": "Brief descriptive title",
  "summary": "2-3 sentence overview of work scope",
  "lineItems": [
    {
      "category": "Labor|Materials|Equipment|Permits|Other",
      "description": "Specific task or material",
      "quantity": number,
      "unit": "hours|sq ft|linear ft|each|lump sum",
      "rate": number,
      "total": number,
      "confidence": "high|medium|low",
      "notes": "clarifications, assumptions, or flags"
    }
  ],
  "assumptions": [
    "List all assumptions made about the project",
    "Include site conditions, access, timeline, etc."
  ],
  "siteVisitRequired": boolean,
  "siteVisitReason": "Why an in-person visit is needed (if applicable)",
  "recommendations": [
    "Optional suggestions for upgrades or alternatives"
  ],
  "timeline": "Estimated duration (e.g., '2-3 days', '1 week')",
  "disclaimers": [
    "This is an estimate based on information provided",
    "Final pricing subject to site inspection and actual conditions",
    "Pricing valid for 30 days"
  ]
}

Stay professional, helpful, and accurate. Your reputation is on the line with every estimate.`

  return systemPrompt
}

/**
 * Build conversation context from chat history
 */
export function buildConversationContext(messages: Array<{ role: string; content: string }>): string {
  if (messages.length === 0) return ''

  return messages
    .map(msg => `${msg.role === 'user' ? 'Customer' : 'Estimator'}: ${msg.content}`)
    .join('\n\n')
}
