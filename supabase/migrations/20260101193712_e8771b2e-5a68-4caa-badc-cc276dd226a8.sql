-- Index for faster filtering by date on analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at 
  ON analytics_events(created_at DESC);

-- Index for faster active session lookup
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_activity 
  ON active_sessions(last_activity DESC);

-- Index for user session lookup
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id 
  ON active_sessions(user_id);