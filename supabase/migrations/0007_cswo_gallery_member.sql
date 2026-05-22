-- Allow approved members to submit gallery photos pending admin review

-- SELECT: public sees active; members see their own uploads; admin sees all
DROP POLICY IF EXISTS "gallery_select" ON public.cswo_gallery;
CREATE POLICY "gallery_select" ON public.cswo_gallery
  FOR SELECT USING (
    is_active = true
    OR auth.uid() = uploaded_by
    OR EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin')
  );

-- INSERT: admin can insert anything; approved members insert their own (is_active must be false)
DROP POLICY IF EXISTS "gallery_insert" ON public.cswo_gallery;
CREATE POLICY "gallery_insert" ON public.cswo_gallery
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin')
    OR (
      uploaded_by = auth.uid()
      AND is_active = false
      AND EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND status = 'approved')
    )
  );

-- UPDATE: admin only
DROP POLICY IF EXISTS "gallery_update" ON public.cswo_gallery;
CREATE POLICY "gallery_update" ON public.cswo_gallery
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin')
  );

-- DELETE: members delete their own; admin deletes any
DROP POLICY IF EXISTS "gallery_delete" ON public.cswo_gallery;
CREATE POLICY "gallery_delete" ON public.cswo_gallery
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.cswo_members WHERE id = auth.uid() AND role = 'admin')
  );
