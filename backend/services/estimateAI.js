/**
 * EstimateAI Service
 * Core AI logic for generating construction estimates
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class EstimateAI {
  
  /**
   * Generate estimate from project description and optional photos
   */
  async generateEstimate(projectData, userPricingRules = null) {
    const {
      description,
      photos = [],
      projectType = 'general',
      location = 'US',
      additionalContext = {}
    } = projectData;

    // Step 1: Analyze photos if provided
    let photoAnalysis = null;
    if (photos.length > 0) {
      photoAnalysis = await this.analyzePhotos(photos);
    }

    // Step 2: Generate estimate using GPT-4
    const estimate = await this.callOpenAI(
      description,
      photoAnalysis,
      userPricingRules,
      projectType,
      location,
      additionalContext
    );

    // Step 3: Apply user pricing rules
    if (userPricingRules) {
      estimate.lineItems = this.applyPricingRules(estimate.lineItems, userPricingRules);
    }

    // Step 4: Calculate totals
    estimate.subtotal = this.calculateSubtotal(estimate.lineItems);
    estimate.tax = estimate.subtotal * (userPricingRules?.taxRate || 0.08);
    estimate.total = estimate.subtotal + estimate.tax;

    return estimate;
  }

  /**
   * Analyze photos using GPT-4 Vision
   */
  async analyzePhotos(photos) {
    const messages = [
      {
        role: 'system',
        content: `You are a construction estimator analyzing project photos. 
                  Extract: room dimensions, materials visible, condition, any damage, 
                  existing fixtures/features, and anything relevant to estimating cost.`
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze these construction project photos:' },
          ...photos.map(url => ({ type: 'image_url', image_url: { url } }))
        ]
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages,
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  }

  /**
   * Generate estimate using GPT-4
   */
  async callOpenAI(description, photoAnalysis, pricingRules, projectType, location, context) {
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
      "notes": "any clarifications"
    }
  ],
  "assumptions": ["list of assumptions made"],
  "recommendations": ["optional suggestions"],
  "timeline": "estimated duration"
}

Pricing guidelines:
- Labor rates: ${pricingRules?.laborRate || '$50-150/hr depending on trade'}
- Material markup: ${pricingRules?.materialMarkup || '20-30%'}
- Location: ${location}
- Project type: ${projectType}

Be thorough. Include all labor, materials, permits, equipment, disposal, etc.`;

    const userPrompt = `
Project Description:
${description}

${photoAnalysis ? `Photo Analysis:\n${photoAnalysis}\n` : ''}

${context.existingConditions ? `Existing Conditions:\n${context.existingConditions}\n` : ''}

Generate a detailed estimate.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3 // Lower temp for more consistent estimates
    });

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Apply user-specific pricing rules to line items
   */
  applyPricingRules(lineItems, rules) {
    return lineItems.map(item => {
      let adjustedRate = item.rate;

      // Apply labor rate overrides
      if (item.category === 'Labor' && rules.laborRates) {
        const tradeRate = rules.laborRates[item.trade || 'general'];
        if (tradeRate) adjustedRate = tradeRate;
      }

      // Apply material markup
      if (item.category === 'Materials' && rules.materialMarkup) {
        adjustedRate = item.rate * (1 + rules.materialMarkup);
      }

      // Apply regional multiplier
      if (rules.regionalMultiplier) {
        adjustedRate = adjustedRate * rules.regionalMultiplier;
      }

      return {
        ...item,
        rate: Math.round(adjustedRate * 100) / 100,
        total: Math.round(item.quantity * adjustedRate * 100) / 100
      };
    });
  }

  /**
   * Calculate subtotal from line items
   */
  calculateSubtotal(lineItems) {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  }

  /**
   * Interactive clarification - ask follow-up questions
   */
  async askClarifyingQuestions(description, conversationHistory = []) {
    const messages = [
      {
        role: 'system',
        content: `You are helping estimate a construction project. 
                  Ask 2-3 specific clarifying questions to generate accurate estimate.
                  Focus on: dimensions, materials, quality level, existing conditions, timeline.`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: description
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      max_tokens: 200
    });

    return response.choices[0].message.content;
  }
}

module.exports = new EstimateAI();
