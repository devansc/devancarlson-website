-- STATUS: PENDING — run this in the Supabase SQL editor
-- Adds song form (ordered list of section names) to songs.

alter table public.songs add column if not exists form text[] not null default '{}';
