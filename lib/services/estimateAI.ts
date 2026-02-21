// lib/services/estimateAI.ts
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from './agentContext'

// Model tier type
export type ModelTier = 'fast' | 'pro' | 'expert'

// OpenAI client
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

// Anthropic client
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set. Please add it to use Expert model.')
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | MessageContent[]
}

export interface MessageContent {
  type: 'text' | 'image_url' | 'image'
  text?: string
  image_url?: { url: string; detail?: string }
  source?: { type: string; media_type: string; data: string }
}

export interface EstimateLineItem {
  category: string
  description: string
  quantity: number
  unit: string
  rate: number
  total: number
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

export interface EstimateResponse {
  projectTitle: string
  summary: string
  lineItems: EstimateLineItem[]
  assumptions: string[]
  siteVisitRequired: boolean
  siteVisitReason?: string
  recommendations: string[]
  timeline: string
  disclaimers: string[]
  subtotal: number
  tax: number
  total: number
}

export interface ChatResponse {
  message: string
  isEstimate: boolean
  estimate?: EstimateResponse
  needsMoreInfo: boolean
}

/**
 * Get model name based on tier
 */
function getModelName(tier: ModelTier): string {
  switch (tier) {
    case 'fast':
      return 'claude-sonnet-4-20250514'
    case 'pro':
      return 'claude-opus-4-20250514'
    case 'expert':
      return 'gpt-5.3-codex'
    default:
      return 'claude-opus-4-20250514'
  }
}

/**
 * Determine which provider to use based on model tier
 */
function getProvider(tier: ModelTier): 'openai' | 'anthropic' {
  switch (tier) {
    case 'fast':
      return 'anthropic'
    case 'pro':
      return 'anthropic'
    case 'expert':
      return 'openai'
    default:
      return 'anthropic'
  }
}

/**
 * Unified AI completion function that works with both OpenAI and Anthropic
 */
async function getAICompletion(
  messages: Message[],
  modelTier: ModelTier,
  temperature: number = 0.3,
  maxTokens: number = 3000,
  jsonMode: boolean = false
): Promise<string> {
  const modelName = getModelName(modelTier)
  const provider = getProvider(modelTier)
  
  if (provider === 'anthropic') {
    // Use Anthropic Claude (Fast = Sonnet 4, Pro = Opus 4)
    try {
      const anthropic = getAnthropic()
      
      // Convert messages to Anthropic format
      const systemMessage = messages.find(m => m.role === 'system')
      const conversationMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: typeof m.content === 'string' 
            ? m.content 
            : m.content.map(c => {
                if (c.type === 'text') return { type: 'text', text: c.text || '' }
                if (c.type === 'image_url' && c.image_url?.url) {
                  // Convert image URL to base64 if needed
                  return { 
                    type: 'image', 
                    source: { 
                      type: 'base64', 
                      media_type: 'image/jpeg', 
                      data: c.image_url.url.replace(/^data:image\/\w+;base64,/, '') 
                    } 
                  }
                }
                return { type: 'text', text: '' }
              })
        }))
      
      const response = await anthropic.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        temperature,
        system: systemMessage?.content as string || '',
        messages: conversationMessages as any
      })
      
      const textContent = response.content.find(c => c.type === 'text')
      return (textContent as any)?.text || ''
    } catch (error: any) {
      if (error.message?.includes('ANTHROPIC_API_KEY')) {
        throw new Error('This model requires Anthropic API key. Please add ANTHROPIC_API_KEY to your environment.')
      }
      throw error
    }
  } else {
    // Use OpenAI
    const openai = getOpenAI()
    
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
    })
    
    return response.choices[0].message.content || ''
  }
}

/**
 * Main conversation handler for estimate generation
 * Uses specified model tier with company context and agent memory
 */
export async function handleEstimateConversation(
  userId: string,
  conversationHistory: Message[],
  userMessage: string,
  taxRate: number = 0.08,
  modelTier: ModelTier = 'pro'
): Promise<ChatResponse> {
  // Build system prompt with company profile and learned memories
  const systemPrompt = await buildSystemPrompt(userId)

  // Add user message to history
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]

  // Determine if we should ask more questions or generate estimate
  const shouldGenerateEstimate = await decideNextAction(messages, modelTier)

  try {
    if (shouldGenerateEstimate) {
      // Generate structured estimate
      return await generateStructuredEstimate(messages, taxRate, modelTier)
    } else {
      // Ask clarifying questions
      return await askClarifyingQuestions(messages, modelTier)
    }
  } catch (error: any) {
    console.error('Error in estimate conversation:', error)
    throw error
  }
}

/**
 * Decides whether to ask more questions or generate estimate
 */
async function decideNextAction(messages: Message[], modelTier: ModelTier): Promise<boolean> {
  const conversationLength = messages.filter(m => m.role !== 'system').length

  // If first message, always ask questions
  if (conversationLength <= 1) return false

  // Use AI to decide if we have enough information
  const decisionPrompt = `Based on this conversation, do we have enough information to generate an accurate estimate?

Conversation so far:
${messages
  .filter(m => m.role !== 'system')
  .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : '[multipart message]'}`)
  .join('\n')}

We need to know:
- Project scope and type
- Location/size/dimensions
- Specific requirements
- Timeline/urgency
- Site conditions

Answer with JSON: {"hasEnoughInfo": true/false, "reasoning": "brief explanation"}`

  const decisionMessages: Message[] = [
    {
      role: 'system',
      content: 'You are an assistant that determines if enough information exists to generate an accurate construction estimate.'
    },
    { role: 'user', content: decisionPrompt }
  ]

  const response = await getAICompletion(decisionMessages, 'fast', 0.2, 500, true)
  const decision = JSON.parse(response || '{"hasEnoughInfo": false}')
  return decision.hasEnoughInfo === true
}

/**
 * Asks intelligent clarifying questions
 */
async function askClarifyingQuestions(messages: Message[], modelTier: ModelTier): Promise<ChatResponse> {
  const response = await getAICompletion(
    [
      ...messages,
      {
        role: 'system',
        content: `Ask 2-4 specific, relevant clarifying questions to gather information needed for an accurate estimate. 
        Be professional and conversational. Ask about things like:
        - Residential or commercial?
        - Square footage / dimensions / quantities?
        - New installation or replacement/repair?
        - Specific materials or preferences?
        - Timeline or urgency?
        - Site conditions or access issues?
        
        Keep questions concise and easy to answer.`
      }
    ],
    modelTier,
    0.7,
    500
  )

  return {
    message: response || 'Could you provide more details?',
    isEstimate: false,
    needsMoreInfo: true
  }
}

/**
 * Generates the final structured estimate
 */
async function generateStructuredEstimate(
  messages: Message[],
  taxRate: number,
  modelTier: ModelTier
): Promise<ChatResponse> {
  const estimatePrompt = {
    role: 'system' as const,
    content: `Now generate a complete, structured estimate based on this conversation.
    Use ONLY the labor rates and pricing rules from the company profile.
    Follow the JSON output format specified in the system prompt exactly.
    Every line item MUST have a confidence level (high/medium/low).
    Flag any items that need contractor review with "⚠️ NEEDS REVIEW" in notes.`
  }

  const response = await getAICompletion(
    [...messages, estimatePrompt],
    modelTier,
    0.3,
    3000,
    true
  )

  const estimateData = JSON.parse(response || '{}')

  // Calculate totals
  const subtotal = estimateData.lineItems?.reduce(
    (sum: number, item: any) => sum + (item.total || 0),
    0
  ) || 0
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const estimate: EstimateResponse = {
    ...estimateData,
    subtotal,
    tax,
    total
  }

  return {
    message: `I've prepared a detailed estimate for your project: "${estimate.projectTitle}". Please review the line items below.`,
    isEstimate: true,
    estimate,
    needsMoreInfo: false
  }
}

/**
 * Analyzes photos using GPT-4o or Claude vision
 */
export async function analyzePhotos(
  photos: string[],
  modelTier: ModelTier = 'pro'
): Promise<string> {
  if (photos.length === 0) return ''

  const systemMessage = `You are a construction estimator analyzing project photos.
  Extract: dimensions, materials visible, condition, damage, existing fixtures, 
  site access, and any cost-relevant details. Be specific and quantitative when possible.`

  const photoProvider = getProvider(modelTier)
  
  if (photoProvider === 'anthropic') {
    // Use Claude vision
    const anthropic = getAnthropic()
    
    const imageContent = photos.map(url => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/jpeg' as const,
        data: url.replace(/^data:image\/\w+;base64,/, '')
      }
    }))

    const response = await anthropic.messages.create({
      model: getModelName(modelTier),
      max_tokens: 2000,
      temperature: 0.3,
      system: systemMessage,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze these construction project photos:' },
            ...imageContent
          ]
        }
      ]
    })

    const textContent = response.content.find(c => c.type === 'text')
    return (textContent as any)?.text || ''
  } else {
    // Use OpenAI vision
    const openai = getOpenAI()
    
    const messages: any[] = [
      { role: 'system', content: systemMessage },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze these construction project photos:' },
          ...photos.map(url => ({
            type: 'image_url',
            image_url: { url, detail: 'high' }
          }))
        ]
      }
    ]

    const response = await openai.chat.completions.create({
      model: getModelName(modelTier),
      messages,
      max_tokens: 2000,
      temperature: 0.3
    })

    return response.choices[0].message.content || ''
  }
}

/**
 * Extract text from PDF buffer
 */
export async function extractPDFText(pdfBuffer: Buffer): Promise<string> {
  try {
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(pdfBuffer)
    return data.text
  } catch (error) {
    console.error('Error parsing PDF:', error)
    return '[PDF text extraction failed]'
  }
}

/**
 * Legacy generateEstimate function for backward compatibility
 */
export async function generateEstimate(request: {
  description: string
  photos?: string[]
  userId: string
  taxRate?: number
  modelTier?: ModelTier
}): Promise<EstimateResponse> {
  const { userId, description, photos = [], taxRate = 0.08, modelTier = 'pro' } = request

  // Analyze photos if provided
  let photoContext = ''
  if (photos.length > 0) {
    photoContext = await analyzePhotos(photos, modelTier)
  }

  const initialMessage = photoContext
    ? `${description}\n\nPhoto analysis: ${photoContext}`
    : description

  // Use conversation handler with single message
  const result = await handleEstimateConversation(userId, [], initialMessage, taxRate, modelTier)

  if (!result.isEstimate || !result.estimate) {
    throw new Error('Unable to generate estimate. Please provide more details.')
  }

  return result.estimate
}
