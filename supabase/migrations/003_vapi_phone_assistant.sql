-- Phone assistants table (one per contractor)
CREATE TABLE IF NOT EXISTS phone_assistants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vapi_assistant_id TEXT, -- VAPI's assistant UUID
  vapi_phone_number_id TEXT, -- VAPI's phone number UUID
  phone_number TEXT, -- The actual phone number string
  assistant_name TEXT NOT NULL,
  greeting_message TEXT NOT NULL DEFAULT 'Thanks for calling! How can I help you today?',
  business_hours JSONB DEFAULT '{"mon":{"open":"08:00","close":"17:00"},"tue":{"open":"08:00","close":"17:00"},"wed":{"open":"08:00","close":"17:00"},"thu":{"open":"08:00","close":"17:00"},"fri":{"open":"08:00","close":"17:00"},"sat":null,"sun":null}',
  after_hours_message TEXT DEFAULT 'We are currently closed. Please leave your name, number, and a brief message and we will get back to you.',
  services_offered TEXT[], -- Quick FAQ: what services do you offer?
  service_area TEXT, -- "We serve the greater Missoula area"
  emergency_instructions TEXT, -- "For emergencies, call 911"
  transfer_number TEXT, -- Forward urgent calls here
  voicemail_email TEXT, -- Email call summaries here
  voice_id TEXT DEFAULT 'alloy', -- VAPI voice
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Call logs table
CREATE TABLE IF NOT EXISTS call_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_assistant_id INTEGER REFERENCES phone_assistants(id),
  vapi_call_id TEXT, -- VAPI's call UUID
  caller_number TEXT,
  caller_name TEXT,
  call_duration_seconds INTEGER,
  call_type TEXT DEFAULT 'inbound', -- inbound/outbound
  call_status TEXT, -- completed, missed, voicemail
  summary TEXT, -- AI-generated call summary
  transcript TEXT, -- Full transcript
  caller_intent TEXT, -- What they wanted: estimate, question, emergency, etc.
  lead_captured JSONB, -- {name, phone, email, address, project_description}
  action_needed TEXT, -- "Call back", "Send estimate", "Schedule visit", etc.
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX idx_phone_assistants_user_id ON phone_assistants(user_id);

-- Trigger for phone_assistants updated_at
CREATE TRIGGER update_phone_assistants_updated_at BEFORE UPDATE ON phone_assistants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
