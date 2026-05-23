import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Song, Tag } from "@/lib/database.types";

interface SongRow extends Song {
  song_tags: { tag: Tag }[];
}

export function SongList() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [songsRes, tagsRes] = await Promise.all([
        supabase
          .from("songs")
          .select("*, song_tags(tag:tags(*))")
          .order("updated_at", { ascending: false }),
        supabase.from("tags").select("*").order("name"),
      ]);
      if (cancelled) return;
      if (songsRes.error) setError(songsRes.error.message);
      else setSongs((songsRes.data as unknown as SongRow[]) ?? []);
      if (!tagsRes.error) setTags(tagsRes.data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    return songs.filter((s) => {
      if (filterTag && !s.song_tags.some((st) => st.tag.id === filterTag)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!s.title.toLowerCase().includes(q) && !(s.artist ?? "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [songs, filterTag, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search title or artist…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input max-w-xs"
          value={filterTag ?? ""}
          onChange={(e) => setFilterTag(e.target.value || null)}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="grow" />
        <Link to="/gigg/songs/new" className="btn-primary">
          New song
        </Link>
      </div>

      {error && <div className="card border-red-900 text-sm text-red-300">{error}</div>}
      {loading ? (
        <div className="text-neutral-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-sm text-neutral-400">No songs yet. Click "New song" to add one.</div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((song) => (
            <li key={song.id}>
              <Link
                to={`/gigg/songs/${song.id}`}
                className="card flex items-center justify-between hover:border-neutral-700"
              >
                <div>
                  <div className="font-medium">{song.title}</div>
                  <div className="text-xs text-neutral-400">{song.artist || "—"}</div>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {song.song_tags.map((st) => (
                    <span key={st.tag.id} className="chip">
                      {st.tag.name}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
