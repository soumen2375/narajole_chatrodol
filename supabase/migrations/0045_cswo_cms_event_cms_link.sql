-- CMS Phase 1: Event enhancements + computed status view + media link

-- Additional CMS event fields
ALTER TABLE public.cswo_events
  ADD COLUMN IF NOT EXISTS post_id               uuid        REFERENCES public.cswo_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registration_link     text,
  ADD COLUMN IF NOT EXISTS capacity              int,
  ADD COLUMN IF NOT EXISTS registration_deadline date,
  ADD COLUMN IF NOT EXISTS is_free               boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS price                 numeric(10,2),
  ADD COLUMN IF NOT EXISTS banner_image          text,
  ADD COLUMN IF NOT EXISTS timezone              text        NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS organizer             text;

CREATE INDEX IF NOT EXISTS idx_cswo_events_post ON public.cswo_events(post_id) WHERE post_id IS NOT NULL;

-- Computed event status view (upcoming / ongoing / past)
-- Never store status manually — always computed from dates
CREATE OR REPLACE VIEW public.cswo_events_with_status AS
SELECT
  e.*,
  CASE
    WHEN current_date < e.event_date                                       THEN 'upcoming'
    WHEN current_date BETWEEN e.event_date AND COALESCE(e.end_date, e.event_date) THEN 'ongoing'
    ELSE 'past'
  END AS computed_status,
  -- Sort key: upcoming events ascending by date, past events descending
  CASE
    WHEN current_date <= COALESCE(e.end_date, e.event_date) THEN e.event_date
    ELSE NULL
  END AS upcoming_sort,
  CASE
    WHEN current_date > COALESCE(e.end_date, e.event_date) THEN e.event_date
    ELSE NULL
  END AS past_sort
FROM public.cswo_events e;

-- Grant same RLS-like access on the view as the underlying table
-- (views don't support RLS directly; access is governed by the base table's RLS)
GRANT SELECT ON public.cswo_events_with_status TO authenticated, anon;
