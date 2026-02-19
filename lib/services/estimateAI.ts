// lib/services/estimateAI.ts
import OpenAI from 'openai'

// Lazy init to ensure env vars are available at runtime
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

export interface EstimateRequest {
  description: string
  photos?: string[]
  projectType?: string
  location?: string
  pricingRules?: any
}

export async function generateEstimate(request: EstimateRequest) {
  const { description, photos = [], pricingRules } = request

  // Step 1: Analyze photos if provided (using gpt-4o for vision)
  let photoAnalysis = null
  if (photos.length > 0) {
    photoAnalysis = await analyzePhotos(photos)
  }

  // Step 2: Generate estimate using gpt-4o
  const estimate = await callOpenAI(description, photoAnalysis, pricingRules)

  // Step 3: Calculate totals
  const subtotal = estimate.lineItems.reduce((sum: number, item: any) => sum + item.total, 0)
  const tax = subtotal * (pricingRules?.taxRate || 0.08)
  const total = subtotal + tax

  return {
    ...estimate,
    subtotal,
    tax,
    total,
  }
}

async function analyzePhotos(photos: string[]) {
  const messages: any[] = [
    {
      role: 'system',
      content: `You are a construction estimator analyzing project photos.
                Extract: room dimensions, materials visible, condition, damage,
                existing fixtures, and cost-relevant details.`
    },
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

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini', // ✅ Updated from gpt-4-vision-preview
    messages,
    max_tokens: 1500
  })

  return response.choices[0].message.content
}

async function callOpenAI(
  description: string,
  photoAnalysis: string | null,
  pricingRules: any
) {
  const systemPrompt = `You are an expert construction estimator. Generate detailed, accurate estimates.

Output format (JSON):
{
  "projectTitle": "Brief project name",
  "summary": "2-3 sentence overview",
  "lineItems": [
    {
      "category": "Labor|Materials|Equipment|Permits",
      "description": "Specific task/item",
      "quantity": number,
      "unit": "sq ft|linear ft|hours|each",
      "rate": number,
      "total": number,
      "notes": "clarifications"
    }
  ],
  "assumptions": ["list of assumptions"],
  "recommendations": ["optional suggestions"],
  "timeline": "estimated duration"
}`

  const userPrompt = `
Project Description:
${description}

${photoAnalysis ? `Photo Analysis:\n${photoAnalysis}\n` : ''}

Generate a detailed estimate with all labor, permits, materials, equipment, disposal.`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini', // ✅ Updated from gpt-4-turbo-preview
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}
