-- STATUS: PENDING — run this in the Supabase SQL editor
-- Adds song proficiency status and reference URL to songs.

alter table public.songs add column if not exists status text;
alter table public.songs add column if not exists reference_url text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'songs_status_check') then
    alter table public.songs add constraint songs_status_check
      check (status is null or status in ('learning','working','gig-ready'));
  end if;
end $$;
