-- Personal records (PRs) table
CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  result_seconds INTEGER NOT NULL,
  distance_km DECIMAL(6,2),
  date DATE,
  location TEXT,
  notes TEXT,
  is_official BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

-- Users can see their own records
CREATE POLICY "Users can view own records" ON personal_records
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own records
CREATE POLICY "Users can insert own records" ON personal_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own records
CREATE POLICY "Users can update own records" ON personal_records
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own records
CREATE POLICY "Users can delete own records" ON personal_records
  FOR DELETE USING (auth.uid() = user_id);

-- Coaches can view all records
CREATE POLICY "Coaches can view all records" ON personal_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin')
    )
  );

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON personal_records(user_id);
