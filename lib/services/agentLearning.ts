// lib/services/agentLearning.ts
import { supabase } from '@/lib/db'
import OpenAI from 'openai'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

interface LineItem {
  category: string
  description: string
  quantity: number
  unit: string
  rate: number
  total: number
  confidence?: string
  notes?: string
}

interface FeedbackAnalysis {
  pricingCorrections: string[]
  preferences: string[]
  patterns: string[]
}

/**
 * Analyzes estimate feedback to extract learnings
 */
export async function analyzeEstimateFeedback(
  userId: string,
  estimateId: string,
  originalLineItems: LineItem[],
  editedLineItems: LineItem[],
  feedbackNotes?: string
): Promise<void> {
  // Save feedback to database
  const { error: feedbackError } = await supabase
    .from('estimate_feedback')
    .insert({
      estimate_id: estimateId,
      user_id: userId,
      original_line_items: originalLineItems,
      edited_line_items: editedLineItems,
      approved: true,
      feedback_notes: feedbackNotes || null
    })

  if (feedbackError) {
    console.error('Error saving estimate feedback:', feedbackError)
    throw new Error('Failed to save estimate feedback')
  }

  // Analyze changes using AI
  const learnings = await extractLearningsFromChanges(
    originalLineItems,
    editedLineItems,
    feedbackNotes
  )

  // Save learnings to agent_memory
  await saveLearnings(userId, learnings)
}

/**
 * Uses GPT-4o to analyze what changed and extract actionable learnings
 */
async function extractLearningsFromChanges(
  original: LineItem[],
  edited: LineItem[],
  notes?: string
): Promise<FeedbackAnalysis> {
  const changes = identifyChanges(original, edited)

  if (changes.length === 0 && !notes) {
    return { pricingCorrections: [], preferences: [], patterns: [] }
  }

  const prompt = `Analyze the following estimate changes made by a contractor and extract learnings:

## Changes Made:
${changes.map(c => `- ${c}`).join('\n')}

${notes ? `\n## Contractor Notes:\n${notes}` : ''}

Extract specific, actionable learnings in these categories:

1. **Pricing Corrections** - Specific rate changes that should be remembered (e.g., "Always use $85/hr for residential electrical, not $95")
2. **Preferences** - How the contractor prefers to structure or describe work
3. **Patterns** - Recurring adjustments or business rules

Return JSON:
{
  "pricingCorrections": ["correction 1", "correction 2"],
  "preferences": ["preference 1", "preference 2"],
  "patterns": ["pattern 1", "pattern 2"]
}

Be specific and actionable. Avoid generic statements.`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an AI learning system that extracts actionable business rules from contractor feedback.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return {
      pricingCorrections: result.pricingCorrections || [],
      preferences: result.preferences || [],
      patterns: result.patterns || []
    }
  } catch (error) {
    console.error('Error extracting learnings:', error)
    return { pricingCorrections: [], preferences: [], patterns: [] }
  }
}

/**
 * Identifies what changed between original and edited line items
 */
function identifyChanges(original: LineItem[], edited: LineItem[]): string[] {
  const changes: string[] = []

  // Compare line items
  for (let i = 0; i < Math.max(original.length, edited.length); i++) {
    const orig = original[i]
    const edit = edited[i]

    if (!orig && edit) {
      changes.push(`Added: ${edit.description} - ${edit.quantity} ${edit.unit} @ $${edit.rate}`)
    } else if (orig && !edit) {
      changes.push(`Removed: ${orig.description}`)
    } else if (orig && edit) {
      if (orig.rate !== edit.rate) {
        changes.push(
          `Rate changed for "${orig.description}": $${orig.rate} → $${edit.rate}`
        )
      }
      if (orig.quantity !== edit.quantity) {
        changes.push(
          `Quantity changed for "${orig.description}": ${orig.quantity} → ${edit.quantity}`
        )
      }
      if (orig.description !== edit.description) {
        changes.push(`Description changed: "${orig.description}" → "${edit.description}"`)
      }
    }
  }

  return changes
}

/**
 * Saves extracted learnings to agent_memory
 */
async function saveLearnings(userId: string, learnings: FeedbackAnalysis): Promise<void> {
  const memories: Array<{
    user_id: string
    memory_type: 'pricing_correction' | 'preference' | 'pattern'
    content: string
    metadata: Record<string, any>
  }> = []

  // Add pricing corrections
  learnings.pricingCorrections.forEach(correction => {
    memories.push({
      user_id: userId,
      memory_type: 'pricing_correction',
      content: correction,
      metadata: { confidence: 'high', source: 'estimate_feedback' }
    })
  })

  // Add preferences
  learnings.preferences.forEach(pref => {
    memories.push({
      user_id: userId,
      memory_type: 'preference',
      content: pref,
      metadata: { confidence: 'medium', source: 'estimate_feedback' }
    })
  })

  // Add patterns
  learnings.patterns.forEach(pattern => {
    memories.push({
      user_id: userId,
      memory_type: 'pattern',
      content: pattern,
      metadata: { confidence: 'medium', source: 'estimate_feedback' }
    })
  })

  if (memories.length > 0) {
    const { error } = await supabase.from('agent_memory').insert(memories)

    if (error) {
      console.error('Error saving agent memories:', error)
      throw new Error('Failed to save agent learnings')
    }
  }
}

/**
 * Gets learning statistics for a user
 */
export async function getLearningStats(userId: string): Promise<{
  totalCorrections: number
  totalPreferences: number
  totalPatterns: number
  recentLearnings: Array<{ type: string; content: string; date: string }>
}> {
  const { data: memories, error } = await supabase
    .from('agent_memory')
    .select('memory_type, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching learning stats:', error)
    return {
      totalCorrections: 0,
      totalPreferences: 0,
      totalPatterns: 0,
      recentLearnings: []
    }
  }

  const corrections = memories.filter(m => m.memory_type === 'pricing_correction')
  const preferences = memories.filter(m => m.memory_type === 'preference')
  const patterns = memories.filter(m => m.memory_type === 'pattern')

  const recentLearnings = memories.slice(0, 10).map(m => ({
    type: m.memory_type,
    content: m.content,
    date: new Date(m.created_at).toLocaleDateString()
  }))

  return {
    totalCorrections: corrections.length,
    totalPreferences: preferences.length,
    totalPatterns: patterns.length,
    recentLearnings
  }
}
