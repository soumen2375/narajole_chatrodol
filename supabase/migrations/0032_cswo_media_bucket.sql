-- Create storage bucket 'cswo-media' (public, 10 MB limit, images and pdfs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cswo-media',
  'cswo-media',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/pdf', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Public read for cswo-media
DROP POLICY IF EXISTS "cswo_media_select" ON storage.objects;
CREATE POLICY "cswo_media_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'cswo-media');

-- Authenticated upload for cswo-media
DROP POLICY IF EXISTS "cswo_media_insert" ON storage.objects;
CREATE POLICY "cswo_media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cswo-media');

-- Authenticated delete for cswo-media
DROP POLICY IF EXISTS "cswo_media_delete" ON storage.objects;
CREATE POLICY "cswo_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cswo-media');
