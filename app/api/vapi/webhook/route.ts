import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

/**
 * VAPI Webhook Handler
 * Receives webhook events from VAPI for call tracking and analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message: event } = body;

    console.log('VAPI Webhook Event:', event?.type || 'unknown');

    // Handle different VAPI event types
    switch (event?.type) {
      case 'end-of-call-report':
        return await handleEndOfCallReport(event);
      
      case 'assistant-request':
        return await handleAssistantRequest(event);
      
      case 'function-call':
        return await handleFunctionCall(event);
      
      default:
        console.log('Unhandled VAPI event type:', event?.type);
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error('VAPI webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle end-of-call-report event
 * Save call summary, transcript, and lead data
 */
async function handleEndOfCallReport(event: any) {
  try {
    const {
      call,
      transcript,
      recordingUrl,
      summary,
      analysis
    } = event;

    // Extract assistant ID from the call
    const assistantId = call?.assistantId;
    if (!assistantId) {
      console.error('No assistant ID in end-of-call-report');
      return NextResponse.json({ received: true });
    }

    // Find the phone assistant by VAPI assistant ID
    const { data: phoneAssistant } = await supabase
      .from('phone_assistants')
      .select('id, user_id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (!phoneAssistant) {
      console.error('Phone assistant not found for assistant ID:', assistantId);
      return NextResponse.json({ received: true });
    }

    // Parse caller info from call metadata or transcript analysis
    const callerNumber = call?.customer?.number || call?.from || null;
    const callerName = extractCallerName(transcript, analysis);
    
    // Extract lead information from the analysis
    const leadCaptured = extractLeadInfo(transcript, analysis);
    
    // Determine caller intent
    const callerIntent = determineIntent(transcript, analysis);
    
    // Determine action needed
    const actionNeeded = determineActionNeeded(callerIntent, leadCaptured);

    // Calculate call duration
    const callDuration = call?.endedAt && call?.startedAt
      ? Math.floor((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
      : null;

    // Save call log to database
    const { error } = await supabase
      .from('call_logs')
      .insert({
        user_id: phoneAssistant.user_id,
        phone_assistant_id: phoneAssistant.id,
        vapi_call_id: call?.id,
        caller_number: callerNumber,
        caller_name: callerName,
        call_duration_seconds: callDuration,
        call_type: 'inbound',
        call_status: call?.status || 'completed',
        summary: summary || generateSummary(transcript),
        transcript: formatTranscript(transcript),
        caller_intent: callerIntent,
        lead_captured: leadCaptured,
        action_needed: actionNeeded,
        recording_url: recordingUrl
      });

    if (error) {
      console.error('Failed to save call log:', error);
      throw error;
    }

    // TODO: Send email notification if voicemail_email is set
    // This could be implemented with a service like SendGrid or Resend

    return NextResponse.json({ received: true, saved: true });
  } catch (error) {
    console.error('Error handling end-of-call-report:', error);
    return NextResponse.json({ received: true, error: 'Failed to save call log' });
  }
}

/**
 * Handle assistant-request event
 * Return dynamic assistant configuration
 */
async function handleAssistantRequest(event: any) {
  // This allows per-call customization of the assistant
  // For now, we'll just return success and let VAPI use the default config
  return NextResponse.json({ 
    assistant: {
      // Could customize assistant config here per call if needed
    }
  });
}

/**
 * Handle function-call event
 * Process tool calls like transferCall, bookAppointment, etc.
 */
async function handleFunctionCall(event: any) {
  const { functionCall } = event;
  
  console.log('Function call requested:', functionCall?.name);
  
  // TODO: Implement function handlers as needed
  // Examples: transferCall, bookAppointment, sendEmail, etc.
  
  return NextResponse.json({
    result: 'Function executed successfully'
  });
}

/**
 * Extract caller name from transcript or analysis
 */
function extractCallerName(transcript: any, analysis: any): string | null {
  // Try to extract from analysis structured data
  if (analysis?.structuredData?.callerName) {
    return analysis.structuredData.callerName;
  }
  
  // Try to extract from transcript using simple pattern matching
  const transcriptText = formatTranscript(transcript);
  const namePatterns = [
    /(?:my name is|i'm|this is|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:name['']?s?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = transcriptText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract lead information from transcript and analysis
 */
function extractLeadInfo(transcript: any, analysis: any): any {
  const lead: any = {};
  
  // Try to get structured data from analysis
  if (analysis?.structuredData) {
    lead.name = analysis.structuredData.name || analysis.structuredData.callerName;
    lead.phone = analysis.structuredData.phone || analysis.structuredData.phoneNumber;
    lead.email = analysis.structuredData.email;
    lead.address = analysis.structuredData.address;
    lead.project_description = analysis.structuredData.projectDescription || analysis.structuredData.description;
  }
  
  // Fall back to pattern matching from transcript
  const transcriptText = formatTranscript(transcript);
  
  if (!lead.phone) {
    const phoneMatch = transcriptText.match(/\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/);
    if (phoneMatch) lead.phone = phoneMatch[1];
  }
  
  if (!lead.email) {
    const emailMatch = transcriptText.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    if (emailMatch) lead.email = emailMatch[1];
  }
  
  return Object.keys(lead).length > 0 ? lead : null;
}

/**
 * Determine caller intent from transcript
 */
function determineIntent(transcript: any, analysis: any): string {
  if (analysis?.intent) {
    return analysis.intent;
  }
  
  const transcriptText = formatTranscript(transcript).toLowerCase();
  
  if (transcriptText.includes('estimate') || transcriptText.includes('quote') || transcriptText.includes('how much')) {
    return 'estimate';
  }
  if (transcriptText.includes('emergency') || transcriptText.includes('urgent') || transcriptText.includes('asap')) {
    return 'emergency';
  }
  if (transcriptText.includes('question') || transcriptText.includes('wondering') || transcriptText.includes('asking')) {
    return 'question';
  }
  if (transcriptText.includes('schedule') || transcriptText.includes('appointment') || transcriptText.includes('visit')) {
    return 'schedule';
  }
  
  return 'general';
}

/**
 * Determine what action is needed based on intent and lead capture
 */
function determineActionNeeded(intent: string, leadCaptured: any): string | null {
  if (intent === 'emergency') {
    return 'Call back urgently';
  }
  if (intent === 'estimate' && leadCaptured) {
    return 'Send estimate';
  }
  if (intent === 'schedule' && leadCaptured) {
    return 'Schedule visit';
  }
  if (leadCaptured) {
    return 'Follow up';
  }
  
  return null;
}

/**
 * Format transcript array into readable text
 */
function formatTranscript(transcript: any): string {
  if (!transcript) return '';
  
  if (typeof transcript === 'string') {
    return transcript;
  }
  
  if (Array.isArray(transcript)) {
    return transcript
      .map(msg => {
        const role = msg.role === 'assistant' ? 'AI' : 'Caller';
        return `${role}: ${msg.content || msg.text || ''}`;
      })
      .join('\n');
  }
  
  return JSON.stringify(transcript);
}

/**
 * Generate a simple summary from transcript
 */
function generateSummary(transcript: any): string {
  const text = formatTranscript(transcript);
  
  // Simple summary: first 200 characters
  if (text.length <= 200) {
    return text;
  }
  
  return text.substring(0, 197) + '...';
}
