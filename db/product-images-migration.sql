-- Extra product photos (front is the main `image`; these are the other
-- views: side, back, detail...). Stored as [{ "url": "...", "label": "Side view" }, ...]
-- Run this ONCE in Supabase > SQL Editor BEFORE deploying the new code.
alter table public.products add column if not exists images jsonb;
