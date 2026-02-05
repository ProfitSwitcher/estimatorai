-- EstimatorAI Database Schema
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
