-- Gallery v2: sub-category support + soft-delete (trash) for rejected submissions

ALTER TABLE public.cswo_gallery
  ADD COLUMN IF NOT EXISTS sub_category_bn text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_category_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Exclude soft-deleted photos from public gallery
-- Members still see all their own photos (active, pending, trashed) via uploaded_by = auth.uid()
DROP POLICY IF EXISTS "gallery_select" ON public.cswo_gallery;
CREATE POLICY "gallery_select" ON public.cswo_gallery
  FOR SELECT USING (
    (is_active = true AND deleted_at IS NULL)
    OR auth.uid() = uploaded_by
    OR EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin')
  );
