-- Store per-user notification read states in Supabase.
-- The API uses the server-only service-role client; browser roles receive no table access.

CREATE TABLE IF NOT EXISTS public.user_notification_reads (
  user_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, article_id)
);

ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_notification_reads FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_notification_reads TO service_role;
