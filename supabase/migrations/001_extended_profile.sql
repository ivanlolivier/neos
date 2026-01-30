-- Extended profile fields for sports data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resting_heart_rate INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_heart_rate INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS running_experience TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS race_experience TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sport_goals TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_sport_goals TEXT;
