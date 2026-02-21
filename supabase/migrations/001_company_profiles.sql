-- Migration: Company Profiles, Agent Memory, and Estimate Feedback Tables
-- Created: 2026-02-20

-- Create enum for memory types
CREATE TYPE memory_type AS ENUM ('pricing_correction', 'preference', 'pattern', 'style');

-- Company Profiles Table
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Company Info
  company_name TEXT NOT NULL,
  trade TEXT[] NOT NULL, -- Multi-trade support: ["electrical", "plumbing", "hvac"]
  service_area_city TEXT,
  service_area_state TEXT,
  service_area_zip TEXT,
  
  -- Pricing Configuration
  labor_rates JSONB DEFAULT '{}', -- {"journeyman": 95, "apprentice": 55, "foreman": 115, "helper": 40}
  material_markup_pct DECIMAL(5,2) DEFAULT 25.00,
  overhead_profit_pct DECIMAL(5,2) DEFAULT 15.00,
  tax_rate DECIMAL(5,4) DEFAULT 0.0800,
  
  -- Company Details
  license_number TEXT,
  bond_number TEXT,
  common_job_types TEXT[] DEFAULT '{}',
  preferred_suppliers TEXT[] DEFAULT '{}',
  
  -- Operational Details
  min_job_size DECIMAL(10,2),
  service_call_fee DECIMAL(10,2),
  typical_crew_sizes JSONB DEFAULT '{}', -- {"small": 2, "medium": 4, "large": 6}
  equipment_owned TEXT[] DEFAULT '{}',
  payment_terms TEXT,
  additional_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id)
);

-- Agent Memory Table
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  memory_type memory_type NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Store additional context like frequency, confidence, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for efficient querying
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_agent_memory_user_id ON agent_memory(user_id);
CREATE INDEX idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX idx_agent_memory_created_at ON agent_memory(created_at);

-- Estimate Feedback Table
CREATE TABLE IF NOT EXISTS estimate_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  original_line_items JSONB NOT NULL,
  edited_line_items JSONB NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  feedback_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_estimate_id FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_estimate_feedback_estimate_id ON estimate_feedback(estimate_id);
CREATE INDEX idx_estimate_feedback_user_id ON estimate_feedback(user_id);
CREATE INDEX idx_estimate_feedback_created_at ON estimate_feedback(created_at);

-- Add conversation_state column to estimates table to track chat history
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT '[]';

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for company_profiles
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_profiles
CREATE POLICY "Users can view their own company profile"
  ON company_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company profile"
  ON company_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company profile"
  ON company_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company profile"
  ON company_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for agent_memory
CREATE POLICY "Users can view their own agent memory"
  ON agent_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent memory"
  ON agent_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for estimate_feedback
CREATE POLICY "Users can view their own estimate feedback"
  ON estimate_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own estimate feedback"
  ON estimate_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE company_profiles IS 'Stores contractor company profiles with pricing and operational details';
COMMENT ON TABLE agent_memory IS 'AI agent learning system - stores pricing corrections, preferences, and patterns';
COMMENT ON TABLE estimate_feedback IS 'Tracks user edits to estimates for AI learning';
