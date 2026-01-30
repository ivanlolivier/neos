-- Feed: RLS policies, indexes, and storage for posts/post_photos/post_likes
-- Tables already exist in the schema

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Authenticated users can view all posts" ON posts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Post photos policies
CREATE POLICY "Authenticated users can view all post photos" ON post_photos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert photos for own posts" ON post_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos for own posts" ON post_photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid()
    )
  );

-- Post likes policies
CREATE POLICY "Authenticated users can view all likes" ON post_likes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own likes" ON post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_photos_post_id ON post_photos(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post ON post_likes(user_id, post_id);

-- Storage bucket for post photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-photos', 'post-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload
CREATE POLICY "Authenticated users can upload post photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-photos' AND auth.role() = 'authenticated');

-- Public read access
CREATE POLICY "Public read access for post photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-photos');

-- Users can delete their own uploaded photos
CREATE POLICY "Users can delete own post photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
