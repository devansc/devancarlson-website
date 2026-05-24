// Hand-written row types matching supabase/schema.sql.
// These are used as plain TS types in the UI; the Supabase client itself is
// untyped (data comes back as `any`) so we cast on read.
// Regenerate later with `supabase gen types typescript` if you want full
// end-to-end inference.

export type SongStatus = "learning" | "working" | "gig-ready";

export interface Song {
  id: string;
  user_id: string;
  title: string;
  artist: string | null;
  notes: string | null;
  lyrics: string | null;
  form: string[];
  status: SongStatus | null;
  reference_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  song_id: string;
  position: number;
  name: string;
  chords: string[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
}

export interface SongTag {
  song_id: string;
  tag_id: string;
}

export interface Setlist {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface SetlistSong {
  setlist_id: string;
  song_id: string;
  position: number;
}
