-- Add max attendance streak to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_attendance_streak INTEGER NOT NULL DEFAULT 0;

-- RPC to get aggregated badge stats (avoids loading all activities client-side)
CREATE OR REPLACE FUNCTION get_badge_stats(user_uuid UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_km', COALESCE(SUM(distance_km), 0),
    'total_activities', COUNT(*)
  )
  FROM activities
  WHERE user_id = user_uuid;
$$ LANGUAGE SQL STABLE;
