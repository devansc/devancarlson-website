import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Section, Song } from "@/lib/database.types";
import { SongGigCard } from "./SongGigCard";

interface PlaySong {
  song: Song;
  sections: Section[];
}

export function SetlistPlay() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [songs, setSongs] = useState<PlaySong[]>([]);
  const [index, setIndex] = useState(0);
  const [setlistName, setSetlistName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const [slRes, ssRes] = await Promise.all([
        supabase.from("setlists").select("name").eq("id", id).single(),
        supabase
          .from("setlist_songs")
          .select("position, song:songs(*)")
          .eq("setlist_id", id)
          .order("position"),
      ]);
      if (slRes.error || ssRes.error) {
        setError((slRes.error ?? ssRes.error)!.message);
        setLoading(false);
        return;
      }
      setSetlistName(slRes.data.name);
      const rows = (ssRes.data as unknown as { position: number; song: Song }[]) ?? [];
      const songIds = rows.map((r) => r.song.id);

      if (songIds.length === 0) {
        setSongs([]);
        setLoading(false);
        return;
      }

      const sectionsRes = await supabase
        .from("sections")
        .select("*")
        .in("song_id", songIds)
        .order("position");

      const sectionsBySong = new Map<string, Section[]>();
      for (const sec of (sectionsRes.data ?? []) as Section[]) {
        if (!sectionsBySong.has(sec.song_id)) sectionsBySong.set(sec.song_id, []);
        sectionsBySong.get(sec.song_id)!.push(sec);
      }

      setSongs(
        rows.map((r) => ({
          song: r.song,
          sections: sectionsBySong.get(r.song.id) ?? [],
        })),
      );
      setLoading(false);
    })();
  }, [id, user]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIndex((i) => Math.min(songs.length - 1, i + 1)),
    [songs.length],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  if (loading) return <div className="text-neutral-500 text-sm">Loading…</div>;
  if (error) return <div className="text-sm text-red-300">{error}</div>;
  if (songs.length === 0)
    return <div className="text-sm text-neutral-400">No songs in this setlist.</div>;

  const current = songs[index];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <button className="btn-ghost" onClick={() => navigate(`/gigg/setlists/${id}`)}>
          ✕ Exit
        </button>
        <div className="text-sm text-neutral-400 font-medium">
          {setlistName && <span className="mr-3 text-neutral-500">{setlistName}</span>}
          {index + 1} of {songs.length}
        </div>
      </div>

      <SongGigCard song={current.song} sections={current.sections} />

      <div className="flex justify-between gap-2 pt-4">
        <button className="btn-ghost" onClick={prev} disabled={index === 0}>
          ← Prev
        </button>
        <button className="btn-ghost" onClick={next} disabled={index === songs.length - 1}>
          Next →
        </button>
      </div>
    </div>
  );
}
