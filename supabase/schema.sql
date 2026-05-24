-- Gigg schema.
-- Run this in the Supabase SQL editor (or `supabase db push` with the CLI).
-- It is safe to re-run: every statement is guarded.

-- Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Tables -------------------------------------------------------------------
create table if not exists public.songs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  artist        text,
  notes         text,
  lyrics        text,
  form          text[] not null default '{}',
  status        text check (status in ('learning','working','gig-ready')),
  reference_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists songs_user_id_idx on public.songs (user_id);
-- Migration: add `form` to existing installs.
alter table public.songs add column if not exists form text[] not null default '{}';
-- Migration: add proficiency status + reference URL to existing installs.
alter table public.songs add column if not exists status text;
alter table public.songs add column if not exists reference_url text;
-- Add status check constraint idempotently.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'songs_status_check') then
    alter table public.songs add constraint songs_status_check
      check (status is null or status in ('learning','working','gig-ready'));
  end if;
end $$;

create table if not exists public.sections (
  id        uuid primary key default gen_random_uuid(),
  song_id   uuid not null references public.songs (id) on delete cascade,
  position  int  not null,
  name      text not null,
  chords    text[] not null default '{}'
);
create index if not exists sections_song_id_idx on public.sections (song_id);

create table if not exists public.tags (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users (id) on delete cascade,
  name     text not null,
  unique (user_id, name)
);
create index if not exists tags_user_id_idx on public.tags (user_id);

create table if not exists public.song_tags (
  song_id  uuid not null references public.songs (id) on delete cascade,
  tag_id   uuid not null references public.tags  (id) on delete cascade,
  primary key (song_id, tag_id)
);

create table if not exists public.setlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists setlists_user_id_idx on public.setlists (user_id);

create table if not exists public.setlist_songs (
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  song_id    uuid not null references public.songs    (id) on delete cascade,
  position   int  not null,
  primary key (setlist_id, song_id)
);

-- RLS ----------------------------------------------------------------------
alter table public.songs         enable row level security;
alter table public.sections      enable row level security;
alter table public.tags          enable row level security;
alter table public.song_tags     enable row level security;
alter table public.setlists      enable row level security;
alter table public.setlist_songs enable row level security;

-- Helper: policies are dropped before being created so this file is idempotent.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('songs','sections','tags','song_tags','setlists','setlist_songs')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- songs: owner-only
create policy "songs: select own"     on public.songs for select using  (auth.uid() = user_id);
create policy "songs: insert own"     on public.songs for insert with check (auth.uid() = user_id);
create policy "songs: update own"     on public.songs for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "songs: delete own"     on public.songs for delete using  (auth.uid() = user_id);

-- sections: access through owned song
create policy "sections: rw via song"
  on public.sections for all
  using (exists (select 1 from public.songs s where s.id = sections.song_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.songs s where s.id = sections.song_id and s.user_id = auth.uid()));

-- tags: owner-only
create policy "tags: select own"     on public.tags for select using  (auth.uid() = user_id);
create policy "tags: insert own"     on public.tags for insert with check (auth.uid() = user_id);
create policy "tags: update own"     on public.tags for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tags: delete own"     on public.tags for delete using  (auth.uid() = user_id);

-- song_tags: access requires owning both the song and the tag
create policy "song_tags: rw via song+tag"
  on public.song_tags for all
  using (
    exists (select 1 from public.songs s where s.id = song_tags.song_id and s.user_id = auth.uid())
    and exists (select 1 from public.tags  t where t.id = song_tags.tag_id  and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.songs s where s.id = song_tags.song_id and s.user_id = auth.uid())
    and exists (select 1 from public.tags  t where t.id = song_tags.tag_id  and t.user_id = auth.uid())
  );

-- setlists: owner-only
create policy "setlists: select own"  on public.setlists for select using  (auth.uid() = user_id);
create policy "setlists: insert own"  on public.setlists for insert with check (auth.uid() = user_id);
create policy "setlists: update own"  on public.setlists for update using  (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "setlists: delete own"  on public.setlists for delete using  (auth.uid() = user_id);

-- setlist_songs: access requires owning both setlist and song
create policy "setlist_songs: rw via setlist+song"
  on public.setlist_songs for all
  using (
    exists (select 1 from public.setlists sl where sl.id = setlist_songs.setlist_id and sl.user_id = auth.uid())
    and exists (select 1 from public.songs s where s.id = setlist_songs.song_id  and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.setlists sl where sl.id = setlist_songs.setlist_id and sl.user_id = auth.uid())
    and exists (select 1 from public.songs s where s.id = setlist_songs.song_id  and s.user_id = auth.uid())
  );
