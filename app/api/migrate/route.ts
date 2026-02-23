import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

const MIGRATION_TOKEN = 'mig_7x9pK2wQn4vL8mR3_buildermindai'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (token !== MIGRATION_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    const sql = `-- EstimatorAI Database Schema
-- PostgreSQL

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  company_name VARCHAR(255),
  phone VARCHAR(50),
  
  -- Subscription
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, team, enterprise
  subscription_status VARCHAR(50) DEFAULT 'active',
  stripe_customer_id VARCHAR(255),
  
  -- Pricing Rules (JSON)
  pricing_rules JSONB DEFAULT '{
    "laborRate": 75,
    "laborRates": {
      "general": 75,
      "electrical": 95,
      "plumbing": 85,
      "hvac": 90,
      "carpentry": 70
    },
    "materialMarkup": 0.25,
    "taxRate": 0.08,
    "regionalMultiplier": 1.0
  }',
  
  -- ServiceBook Integration (optional)
  servicebook_integration JSONB,
  
  -- Usage tracking
  estimates_generated_this_month INT DEFAULT 0,
  estimates_limit INT DEFAULT 5, -- Based on tier
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Estimates table
CREATE TABLE estimates (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Project info
  project_title VARCHAR(255) NOT NULL,
  description TEXT,
  project_type VARCHAR(100), -- residential, commercial, renovation, etc.
  location VARCHAR(255),
  
  -- Line items (JSON array)
  line_items JSONB NOT NULL,
  
  -- Totals
  subtotal DECIMAL(12,2) NOT NULL,
  tax DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  
  -- Metadata
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, accepted, rejected
  assumptions JSONB,
  recommendations JSONB,
  timeline VARCHAR(255),
  
  -- Photos (URLs or base64)
  photos JSONB,
  
  -- ServiceBook sync
  servicebook_estimate_id VARCHAR(100),
  synced_to_servicebook BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Estimate history (for tracking edits)
CREATE TABLE estimate_history (
  id SERIAL PRIMARY KEY,
  estimate_id INT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Changes
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Pricing templates (reusable line items)
CREATE TABLE pricing_templates (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Default values
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  rate DECIMAL(10,2),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE api_usage (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  endpoint VARCHAR(255),
  method VARCHAR(10),
  tokens_used INT,
  cost DECIMAL(10,4),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- === MIGRATIONS ===

-- ============================================================
-- BuilderMindAI - Combined Migrations (NO RLS)
-- This app uses custom NextAuth - NOT Supabase Auth
-- Authorization is handled in API routes via JWT, not RLS
-- ============================================================

-- MIGRATION 001: Company Profiles, Agent Memory, Estimate Feedback

DO $$ BEGIN
  CREATE TYPE memory_type AS ENUM ('pricing_correction', 'preference', 'pattern', 'style');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS company_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  trade TEXT[] NOT NULL,
  service_area_city TEXT, service_area_state TEXT, service_area_zip TEXT,
  labor_rates JSONB DEFAULT '{}',
  material_markup_pct DECIMAL(5,2) DEFAULT 25.00,
  overhead_profit_pct DECIMAL(5,2) DEFAULT 15.00,
  tax_rate DECIMAL(5,4) DEFAULT 0.0800,
  license_number TEXT, bond_number TEXT,
  common_job_types TEXT[] DEFAULT '{}',
  preferred_suppliers TEXT[] DEFAULT '{}',
  min_job_size DECIMAL(10,2), service_call_fee DECIMAL(10,2),
  typical_crew_sizes JSONB DEFAULT '{}',
  equipment_owned TEXT[] DEFAULT '{}',
  payment_terms TEXT, additional_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS agent_memory (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_type memory_type NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_user_id ON agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_created_at ON agent_memory(created_at);

CREATE TABLE IF NOT EXISTS estimate_feedback (
  id SERIAL PRIMARY KEY,
  estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_line_items JSONB NOT NULL,
  edited_line_items JSONB NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  feedback_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_feedback_estimate_id ON estimate_feedback(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_feedback_user_id ON estimate_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_feedback_created_at ON estimate_feedback(created_at);

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT '[]';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_company_profiles_updated_at ON company_profiles;
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- MIGRATION 002: Model Picker, Attachments, Business Advisor

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS model_tier TEXT DEFAULT 'pro';

CREATE TABLE IF NOT EXISTS estimate_attachments (
  id SERIAL PRIMARY KEY,
  estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL, file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL, storage_path TEXT NOT NULL,
  ai_analysis TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_attachments_estimate_id ON estimate_attachments(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_attachments_user_id ON estimate_attachments(user_id);

DO $$ BEGIN
  CREATE TYPE advisor_topic AS ENUM ('playbook', 'exit_strategy', 'sops', 'financial', 'growth');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS advisor_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic advisor_topic NOT NULL, title TEXT NOT NULL,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_conversations_user_id ON advisor_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_advisor_conversations_topic ON advisor_conversations(topic);
CREATE INDEX IF NOT EXISTS idx_advisor_conversations_updated_at ON advisor_conversations(updated_at);

CREATE TABLE IF NOT EXISTS advisor_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES advisor_conversations(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
  version INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_documents_user_id ON advisor_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_advisor_documents_conversation_id ON advisor_documents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_advisor_documents_doc_type ON advisor_documents(doc_type);

DROP TRIGGER IF EXISTS update_advisor_conversations_updated_at ON advisor_conversations;
CREATE TRIGGER update_advisor_conversations_updated_at BEFORE UPDATE ON advisor_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- MIGRATION 003: VAPI Phone Assistant

CREATE TABLE IF NOT EXISTS phone_assistants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vapi_assistant_id TEXT, vapi_phone_number_id TEXT, phone_number TEXT,
  assistant_name TEXT NOT NULL,
  greeting_message TEXT NOT NULL DEFAULT 'Thanks for calling! How can I help you today?',
  business_hours JSONB DEFAULT '{"mon":{"open":"08:00","close":"17:00"},"tue":{"open":"08:00","close":"17:00"},"wed":{"open":"08:00","close":"17:00"},"thu":{"open":"08:00","close":"17:00"},"fri":{"open":"08:00","close":"17:00"},"sat":null,"sun":null}',
  after_hours_message TEXT DEFAULT 'We are currently closed. Please leave a message.',
  services_offered TEXT[], service_area TEXT,
  emergency_instructions TEXT, transfer_number TEXT, voicemail_email TEXT,
  voice_id TEXT DEFAULT 'alloy', is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS call_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_assistant_id INTEGER REFERENCES phone_assistants(id),
  vapi_call_id TEXT, caller_number TEXT, caller_name TEXT,
  call_duration_seconds INTEGER, call_type TEXT DEFAULT 'inbound',
  call_status TEXT, summary TEXT, transcript TEXT,
  caller_intent TEXT, lead_captured JSONB, action_needed TEXT,
  recording_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_phone_assistants_user_id ON phone_assistants(user_id);

DROP TRIGGER IF EXISTS update_phone_assistants_updated_at ON phone_assistants;
CREATE TRIGGER update_phone_assistants_updated_at BEFORE UPDATE ON phone_assistants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ALL DONE!
`

    // Execute the full SQL as a single transaction
    const results: string[] = []

    // Split on semicolons but preserve DO $$ blocks
    const statements: string[] = []
    let current = ''
    let inDollarQuote = false

    for (let i = 0; i < sql.length; i++) {
      current += sql[i]
      if (sql.slice(i, i+2) === '$$') {
        inDollarQuote = !inDollarQuote
      }
      if (sql[i] === ';' && !inDollarQuote) {
        const stmt = current.trim()
        if (stmt && !stmt.startsWith('--') && stmt !== ';') {
          statements.push(stmt)
        }
        current = ''
      }
    }
    if (current.trim()) statements.push(current.trim())

    let ok = 0, skipped = 0
    for (const stmt of statements) {
      if (!stmt || stmt.startsWith('--')) { skipped++; continue }
      try {
        await client.query(stmt)
        ok++
        results.push('OK: ' + stmt.slice(0, 50).replace(/\n/g, ' '))
      } catch (e: any) {
        const msg = e.message
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          skipped++
          results.push('SKIP: ' + stmt.slice(0, 50).replace(/\n/g, ' '))
        } else {
          results.push('ERR: ' + msg.slice(0, 100) + ' | ' + stmt.slice(0, 50))
        }
      }
    }

    await client.end()
    return NextResponse.json({ status: 'success', ok, skipped, total: statements.length, results })

  } catch (e: any) {
    await client.end().catch(() => {})
    return NextResponse.json({ status: 'error', error: e.message }, { status: 500 })
  }
}
