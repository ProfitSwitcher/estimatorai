-- Migration: Model Picker, Attachments, and Business Advisor
-- Created: 2026-02-20

-- Feature 1: Model Picker - Add model_tier to estimates table
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS model_tier TEXT DEFAULT 'pro';
COMMENT ON COLUMN estimates.model_tier IS 'AI model tier used: fast (gpt-4o-mini), pro (gpt-4o), expert (claude-sonnet-4-5)';

-- Feature 2: Photo & File Attachments
-- Create estimate_attachments table
CREATE TABLE IF NOT EXISTS estimate_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- image/jpeg, application/pdf, etc.
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  ai_analysis TEXT, -- AI-extracted insights from the file
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_estimate_id FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_estimate_attachments_estimate_id ON estimate_attachments(estimate_id);
CREATE INDEX idx_estimate_attachments_user_id ON estimate_attachments(user_id);

-- RLS for estimate_attachments
ALTER TABLE estimate_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attachments"
  ON estimate_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attachments"
  ON estimate_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
  ON estimate_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- Feature 3: Business Advisor Module
-- Create advisor_conversations table
CREATE TYPE advisor_topic AS ENUM ('playbook', 'exit_strategy', 'sops', 'financial', 'growth');

CREATE TABLE IF NOT EXISTS advisor_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  topic advisor_topic NOT NULL,
  title TEXT NOT NULL,
  messages JSONB DEFAULT '[]', -- Array of {role, content} messages
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_advisor_conversations_user_id ON advisor_conversations(user_id);
CREATE INDEX idx_advisor_conversations_topic ON advisor_conversations(topic);
CREATE INDEX idx_advisor_conversations_updated_at ON advisor_conversations(updated_at);

-- Create advisor_documents table
CREATE TABLE IF NOT EXISTS advisor_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES advisor_conversations(id) ON DELETE CASCADE,
  
  doc_type TEXT NOT NULL, -- playbook_section, sop, analysis, etc.
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conversation_id FOREIGN KEY (conversation_id) REFERENCES advisor_conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_advisor_documents_user_id ON advisor_documents(user_id);
CREATE INDEX idx_advisor_documents_conversation_id ON advisor_documents(conversation_id);
CREATE INDEX idx_advisor_documents_doc_type ON advisor_documents(doc_type);

-- Trigger for advisor_conversations updated_at
CREATE TRIGGER update_advisor_conversations_updated_at BEFORE UPDATE ON advisor_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for advisor_conversations
ALTER TABLE advisor_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own advisor conversations"
  ON advisor_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own advisor conversations"
  ON advisor_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own advisor conversations"
  ON advisor_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own advisor conversations"
  ON advisor_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for advisor_documents
ALTER TABLE advisor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own advisor documents"
  ON advisor_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own advisor documents"
  ON advisor_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own advisor documents"
  ON advisor_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own advisor documents"
  ON advisor_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE estimate_attachments IS 'Stores file attachments (photos, PDFs) for estimates';
COMMENT ON TABLE advisor_conversations IS 'Business advisor chat conversations by topic';
COMMENT ON TABLE advisor_documents IS 'Documents generated from business advisor (playbooks, SOPs, analyses)';

-- Create storage bucket for attachments (run this manually in Supabase dashboard or via JS)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('estimate-attachments', 'estimate-attachments', false);
