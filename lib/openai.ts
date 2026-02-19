import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const GPT_4O_MODEL = 'gpt-4o' // Unified text + vision model
