// VAPI API Service Layer
// API Documentation: https://docs.vapi.ai

const VAPI_API_BASE = 'https://api.vapi.ai';
const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY;

interface CompanyProfile {
  company_name: string;
  trade: string[];
  service_area_city?: string;
  service_area_state?: string;
}

interface PhoneAssistant {
  id?: number;
  assistant_name: string;
  greeting_message: string;
  business_hours: any;
  after_hours_message: string;
  services_offered?: string[];
  service_area?: string;
  emergency_instructions?: string;
  transfer_number?: string;
  voice_id?: string;
}

interface VapiAssistantConfig {
  name: string;
  model: {
    provider: string;
    model: string;
    messages: Array<{
      role: string;
      content: string;
    }>;
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage: string;
  transcriber?: {
    provider: string;
    model: string;
  };
  endCallFunctionEnabled?: boolean;
}

/**
 * Build the system prompt for the VAPI assistant
 */
export function buildAssistantPrompt(
  companyProfile: CompanyProfile,
  phoneAssistant: PhoneAssistant
): string {
  const trades = companyProfile.trade.join(', ');
  const location = [companyProfile.service_area_city, companyProfile.service_area_state]
    .filter(Boolean)
    .join(', ');

  const businessHours = formatBusinessHours(phoneAssistant.business_hours);
  const servicesOffered = phoneAssistant.services_offered?.join(', ') || 'various contracting services';

  const prompt = `You are the AI phone receptionist for ${companyProfile.company_name}, a ${trades} contractor${location ? ` in ${location}` : ''}.

Your job: Answer calls warmly and professionally. You represent ${companyProfile.company_name}.

GREETING: ${phoneAssistant.greeting_message}

BUSINESS HOURS:
${businessHours}

AFTER HOURS: ${phoneAssistant.after_hours_message}

SERVICES OFFERED: ${servicesOffered}

${phoneAssistant.service_area ? `SERVICE AREA: ${phoneAssistant.service_area}` : ''}

${phoneAssistant.emergency_instructions ? `EMERGENCY: ${phoneAssistant.emergency_instructions}` : ''}

YOUR GOALS (in order):
1. Greet the caller warmly using the company name
2. Find out what they need (estimate, service call, question, emergency)
3. Collect their info: name, phone number, email, address, project description
4. If they want an estimate, gather as much detail as possible about the project
5. Let them know someone will follow up within 24 hours
${phoneAssistant.transfer_number ? `6. If urgent/emergency, offer to transfer to ${phoneAssistant.transfer_number}` : ''}

RULES:
- Keep responses to 2-3 sentences (this is voice, not text)
- Be warm, professional, and conversational
- NEVER make up pricing or give estimates on the phone
- If asked about pricing, say "We'd need to take a look at the project first — can I get your info so we can put together a proper estimate?"
- Collect as much lead info as naturally possible
- If it's after hours, inform them and take a message
- Always confirm you've captured their contact info correctly before ending the call`;

  return prompt;
}

/**
 * Format business hours for the prompt
 */
function formatBusinessHours(hours: any): string {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const formatted: string[] = [];
  
  days.forEach((day, idx) => {
    if (hours[day]) {
      formatted.push(`${dayNames[idx]}: ${hours[day].open} - ${hours[day].close}`);
    } else {
      formatted.push(`${dayNames[idx]}: Closed`);
    }
  });
  
  return formatted.join('\n');
}

/**
 * Create a new VAPI assistant
 */
export async function createAssistant(
  companyProfile: CompanyProfile,
  phoneAssistant: PhoneAssistant
): Promise<{ assistantId: string }> {
  const systemPrompt = buildAssistantPrompt(companyProfile, phoneAssistant);

  const config: VapiAssistantConfig = {
    name: phoneAssistant.assistant_name,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ]
    },
    voice: {
      provider: 'playht',
      voiceId: phoneAssistant.voice_id || 'jennifer'
    },
    firstMessage: phoneAssistant.greeting_message,
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2'
    },
    endCallFunctionEnabled: true
  };

  const response = await fetch(`${VAPI_API_BASE}/assistant`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create VAPI assistant: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { assistantId: data.id };
}

/**
 * Update an existing VAPI assistant
 */
export async function updateAssistant(
  assistantId: string,
  companyProfile: CompanyProfile,
  phoneAssistant: PhoneAssistant
): Promise<void> {
  const systemPrompt = buildAssistantPrompt(companyProfile, phoneAssistant);

  const config: VapiAssistantConfig = {
    name: phoneAssistant.assistant_name,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ]
    },
    voice: {
      provider: 'playht',
      voiceId: phoneAssistant.voice_id || 'jennifer'
    },
    firstMessage: phoneAssistant.greeting_message,
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2'
    },
    endCallFunctionEnabled: true
  };

  const response = await fetch(`${VAPI_API_BASE}/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update VAPI assistant: ${response.status} ${error}`);
  }
}

/**
 * Delete a VAPI assistant
 */
export async function deleteAssistant(assistantId: string): Promise<void> {
  const response = await fetch(`${VAPI_API_BASE}/assistant/${assistantId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
    }
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete VAPI assistant: ${response.status} ${error}`);
  }
}

/**
 * Buy a phone number from VAPI
 */
export async function buyPhoneNumber(
  assistantId: string,
  areaCode?: string
): Promise<{ phoneNumberId: string; phoneNumber: string }> {
  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/vapi/webhook`;

  const body: any = {
    assistantId,
    serverUrl: webhookUrl,
    ...(areaCode && { areaCode })
  };

  const response = await fetch(`${VAPI_API_BASE}/phone-number`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to buy phone number: ${response.status} ${error}`);
  }

  const data = await response.json();
  return {
    phoneNumberId: data.id,
    phoneNumber: data.number || data.phoneNumber
  };
}

/**
 * Release a phone number
 */
export async function releasePhoneNumber(phoneNumberId: string): Promise<void> {
  const response = await fetch(`${VAPI_API_BASE}/phone-number/${phoneNumberId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
    }
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to release phone number: ${response.status} ${error}`);
  }
}

/**
 * Get call logs from VAPI
 */
export async function getCallLogs(assistantId: string): Promise<any[]> {
  const response = await fetch(`${VAPI_API_BASE}/call?assistantId=${assistantId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get call logs: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data;
}
