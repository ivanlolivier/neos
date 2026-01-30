-- =====================================================
-- NEOS Running Club - Database Schema
-- =====================================================
-- Run this in Supabase SQL Editor to create all tables
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: profiles (extends auth.users)
-- =====================================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'coach', 'admin')),
    phone TEXT,
    emergency_contact TEXT,
    -- Integrations
    garmin_access_token TEXT,
    garmin_refresh_token TEXT,
    garmin_token_expires_at TIMESTAMPTZ,
    healthkit_enabled BOOLEAN DEFAULT FALSE,
    -- Preferences
    notification_preferences JSONB DEFAULT '{"reminders": true, "news": true, "events": true}'::jsonb,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: trainings (recurring trainings)
-- =====================================================
CREATE TABLE trainings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('running', 'strength', 'track')),
    name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    time_slots TEXT[] NOT NULL DEFAULT ARRAY['07:00', '19:00'],
    location TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: training_sessions (specific instances)
-- =====================================================
CREATE TABLE training_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    training_id UUID REFERENCES trainings(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    notes TEXT,
    cancelled BOOLEAN DEFAULT FALSE,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(training_id, date, time_slot)
);

-- =====================================================
-- TABLA: attendances
-- =====================================================
CREATE TABLE attendances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    time_slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'attended', 'no_show')),
    confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- =====================================================
-- TABLA: personal_plans
-- =====================================================
CREATE TABLE personal_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    week_start DATE NOT NULL, -- Always Monday
    plan_type TEXT NOT NULL CHECK (plan_type IN ('running', 'weekend', 'strength')),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start, plan_type)
);

-- =====================================================
-- TABLA: events
-- =====================================================
CREATE TABLE events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('track', 'trail', 'trekking', 'workshop', 'social', 'race')),
    description TEXT,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    location_url TEXT,
    image_url TEXT,
    max_capacity INTEGER,
    registration_deadline TIMESTAMPTZ,
    price DECIMAL(10,2) DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: event_registrations
-- =====================================================
CREATE TABLE event_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'waitlist', 'cancelled', 'attended')),
    notes TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- =====================================================
-- TABLA: activities (synced from Garmin/HealthKit)
-- =====================================================
CREATE TABLE activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('garmin', 'healthkit', 'manual')),
    external_id TEXT,
    activity_type TEXT NOT NULL DEFAULT 'running',
    date DATE NOT NULL,
    start_time TIMESTAMPTZ,
    distance_km DECIMAL(6,2),
    duration_seconds INTEGER,
    avg_pace_seconds INTEGER,
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    elevation_gain_m INTEGER,
    calories INTEGER,
    title TEXT,
    notes TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, source, external_id)
);

-- =====================================================
-- TABLA: posts
-- =====================================================
CREATE TABLE posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: post_photos
-- =====================================================
CREATE TABLE post_photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: post_likes
-- =====================================================
CREATE TABLE post_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- =====================================================
-- TABLA: announcements
-- =====================================================
CREATE TABLE announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES profiles(id),
    image_url TEXT,
    pinned BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- =====================================================
-- TABLA: push_tokens
-- =====================================================
CREATE TABLE push_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    device_id TEXT,
    platform TEXT CHECK (platform IN ('ios', 'android')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, expo_push_token)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_attendances_session ON attendances(session_id);
CREATE INDEX idx_attendances_user ON attendances(user_id);
CREATE INDEX idx_training_sessions_date ON training_sessions(date);
CREATE INDEX idx_personal_plans_user_week ON personal_plans(user_id, week_start);
CREATE INDEX idx_activities_user_date ON activities(user_id, date);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_announcements_published ON announcements(published_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles viewable by authenticated" ON profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Trainings policies
CREATE POLICY "Trainings viewable by authenticated" ON trainings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coaches can manage trainings" ON trainings
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    );

-- Training sessions policies
CREATE POLICY "Sessions viewable by authenticated" ON training_sessions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Sessions insertable by authenticated" ON training_sessions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Coaches can manage sessions" ON training_sessions
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    );

-- Attendances policies
CREATE POLICY "Attendances viewable by authenticated" ON attendances
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own attendance" ON attendances
    FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Coaches can update any attendance" ON attendances
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    );

-- Personal plans policies
CREATE POLICY "Users can view own plans" ON personal_plans
    FOR SELECT TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    );

CREATE POLICY "Users can update own plan" ON personal_plans
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Coaches can manage all plans" ON personal_plans
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    );

-- Events policies
CREATE POLICY "Published events viewable by authenticated" ON events
    FOR SELECT TO authenticated USING (is_published = true OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    );

CREATE POLICY "Coaches can manage events" ON events
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    );

-- Event registrations policies
CREATE POLICY "Registrations viewable by authenticated" ON event_registrations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own registration" ON event_registrations
    FOR ALL TO authenticated USING (user_id = auth.uid());

-- Activities policies
CREATE POLICY "Users can view own activities" ON activities
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can manage own activities" ON activities
    FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Coaches can view all activities" ON activities
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    );

-- Posts policies
CREATE POLICY "Posts viewable by authenticated" ON posts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create posts" ON posts
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own posts or coaches can delete any" ON posts
    FOR DELETE TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    );

-- Post photos policies
CREATE POLICY "Post photos viewable by authenticated" ON post_photos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own post photos" ON post_photos
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid())
    );

-- Post likes policies
CREATE POLICY "Likes viewable by authenticated" ON post_likes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own likes" ON post_likes
    FOR ALL TO authenticated USING (user_id = auth.uid());

-- Announcements policies
CREATE POLICY "Announcements viewable by authenticated" ON announcements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coaches can manage announcements" ON announcements
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
    );

-- Push tokens policies
CREATE POLICY "Users can manage own push tokens" ON push_tokens
    FOR ALL TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_personal_plans_updated_at
    BEFORE UPDATE ON personal_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_attendances_updated_at
    BEFORE UPDATE ON attendances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_push_tokens_updated_at
    BEFORE UPDATE ON push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Insert sample trainings (uncomment to use)
-- INSERT INTO trainings (type, name, day_of_week, time_slots, location) VALUES
-- ('running', 'Running Martes', 2, ARRAY['07:00', '19:00'], 'Parque Centenario'),
-- ('running', 'Running Jueves', 4, ARRAY['07:00', '19:00'], 'Parque Centenario'),
-- ('strength', 'Fuerza Lunes', 1, ARRAY['07:00'], 'Plaza principal');
