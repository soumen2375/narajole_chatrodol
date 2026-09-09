-- The secretary's letter body becomes a formatted document rather than a
-- block of plain text: headings, bold and italic, lists, alignment, links
-- with their own display text, and images placed between paragraphs.
--
-- The formatted copy is stored as HTML in body_html — the editor's own
-- output, and what both the A4 preview and the PDF renderer typeset.
--
-- body is kept, and kept in step, as the plain-text reading of the same
-- letter. Nothing that only needs the words — the "a letter needs a body
-- before it can be sent" check, the Latin-script warning, a future search —
-- has to learn to parse HTML, and a letter written before this migration
-- still prints: an empty body_html means "fall back to the plain text".

ALTER TABLE public.cswo_event_letters
  ADD COLUMN IF NOT EXISTS body_html text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.cswo_event_letters.body_html IS
  'Formatted letter body (editor HTML). Empty means the letter predates rich text; render body as plain paragraphs instead.';

COMMENT ON COLUMN public.cswo_event_letters.body IS
  'Plain-text reading of body_html, kept in step by the compose screen. Used for validation, warnings and search.';
