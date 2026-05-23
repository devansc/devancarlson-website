import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Setlist, Song } from "@/lib/database.types";

interface SetlistSongRow {
  position: number;
  song: Song;
}

export function SetlistDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<SetlistSongRow[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [addSongId, setAddSongId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id || !user) return;
    const [slRes, songsRes, allRes] = await Promise.all([
      supabase.from("setlists").select("*").eq("id", id).single(),
      supabase
        .from("setlist_songs")
        .select("position, song:songs(*)")
        .eq("setlist_id", id)
        .order("position"),
      supabase.from("songs").select("*").order("title"),
    ]);
    if (slRes.error) {
      setError(slRes.error.message);
    } else {
      setSetlist(slRes.data);
    }
    if (!songsRes.error) setSongs((songsRes.data as unknown as SetlistSongRow[]) ?? []);
    if (!allRes.error) setAllSongs(allRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const addSong = async () => {
    if (!addSongId || !id) return;
    const nextPos = songs.length;
    const { error } = await supabase
      .from("setlist_songs")
      .insert({ setlist_id: id, song_id: addSongId, position: nextPos });
    if (error) {
      setError(error.message);
      return;
    }
    setAddSongId("");
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= songs.length || !id) return;
    const a = songs[index];
    const b = songs[j];
    // Swap positions
    await supabase
      .from("setlist_songs")
      .update({ position: b.position })
      .eq("setlist_id", id)
      .eq("song_id", a.song.id);
    await supabase
      .from("setlist_songs")
      .update({ position: a.position })
      .eq("setlist_id", id)
      .eq("song_id", b.song.id);
    load();
  };

  const removeSong = async (songId: string) => {
    if (!id) return;
    await supabase.from("setlist_songs").delete().eq("setlist_id", id).eq("song_id", songId);
    load();
  };

  const removeSetlist = async () => {
    if (!id) return;
    if (!confirm("Delete this setlist?")) return;
    await supabase.from("setlists").delete().eq("id", id);
    navigate("/gigg/setlists");
  };

  if (loading) return <div className="text-neutral-500 text-sm">Loading…</div>;
  if (!setlist) return <div className="text-sm text-red-300">{error ?? "Not found."}</div>;

  const songIdsInList = new Set(songs.map((s) => s.song.id));
  const candidates = allSongs.filter((s) => !songIdsInList.has(s.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button className="btn-ghost" onClick={() => navigate("/gigg/setlists")}>
          ← Back
        </button>
        <button className="btn-ghost text-red-300 hover:bg-red-950/40" onClick={removeSetlist}>
          Delete setlist
        </button>
      </div>
      <h2 className="text-xl font-semibold">{setlist.name}</h2>

      {error && <div className="card border-red-900 text-sm text-red-300">{error}</div>}

      <ol className="space-y-2">
        {songs.map((row, i) => (
          <li key={row.song.id} className="card flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-neutral-500 w-6 text-right">{i + 1}.</span>
              <div>
                <div className="font-medium">{row.song.title}</div>
                <div className="text-xs text-neutral-400">{row.song.artist || "—"}</div>
              </div>
            </div>
            <div className="flex gap-1">
              <button className="btn-ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                ↑
              </button>
              <button
                className="btn-ghost"
                onClick={() => move(i, 1)}
                disabled={i === songs.length - 1}
              >
                ↓
              </button>
              <button
                className="btn-ghost text-red-300 hover:bg-red-950/40"
                onClick={() => removeSong(row.song.id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="card flex gap-2">
        <select
          className="input"
          value={addSongId}
          onChange={(e) => setAddSongId(e.target.value)}
        >
          <option value="">Add a song…</option>
          {candidates.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
              {s.artist ? ` — ${s.artist}` : ""}
            </option>
          ))}
        </select>
        <button className="btn-primary" onClick={addSong} disabled={!addSongId}>
          Add
        </button>
      </div>
    </div>
  );
}
