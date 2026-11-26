-- Create user_notification_reads table to track which notifications each user has read.
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks).

-- Create the table
CREATE TABLE IF NOT EXISTS user_notification_reads (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_user_notification_reads_user_id ON user_notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_reads_article_id ON user_notification_reads(article_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notification_reads_unique ON user_notification_reads(user_id, article_id);

-- Enable Row Level Security
ALTER TABLE user_notification_reads ENABLE ROW LEVEL SECURITY;

-- Allow all operations (handled by app logic / server-side API)
DROP POLICY IF EXISTS "Allow all operations on user_notification_reads" ON user_notification_reads;
CREATE POLICY "Allow all operations on user_notification_reads"
  ON user_notification_reads
  FOR ALL
  USING (true)
  WITH CHECK (true);
