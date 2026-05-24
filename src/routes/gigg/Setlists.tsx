import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Setlist } from "@/lib/database.types";

export function Setlists() {
  const { user } = useAuth();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("setlists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      else setSetlists(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const duplicate = async (sl: Setlist) => {
    if (!user) return;
    const { data: newSl, error: slErr } = await supabase
      .from("setlists")
      .insert({ user_id: user.id, name: `${sl.name} (copy)` })
      .select("*")
      .single();
    if (slErr || !newSl) {
      setError(slErr?.message ?? "Failed to duplicate");
      return;
    }
    const { data: existing } = await supabase
      .from("setlist_songs")
      .select("song_id, position")
      .eq("setlist_id", sl.id);
    if (existing && existing.length > 0) {
      await supabase.from("setlist_songs").insert(
        existing.map((row) => ({
          setlist_id: newSl.id,
          song_id: row.song_id,
          position: row.position,
        })),
      );
    }
    setSetlists((s) => [newSl, ...s]);
  };

  const create = async () => {
    if (!name.trim() || !user) return;
    const { data, error } = await supabase
      .from("setlists")
      .insert({ user_id: user.id, name: name.trim() })
      .select("*")
      .single();
    if (error || !data) {
      setError(error?.message ?? "Failed");
      return;
    }
    setSetlists((s) => [data, ...s]);
    setName("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="input flex-1 min-w-0"
          placeholder="New setlist name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              create();
            }
          }}
        />
        <button className="btn-primary" onClick={create}>
          Create
        </button>
      </div>
      {error && <div className="card border-red-900 text-sm text-red-300">{error}</div>}
      {loading ? (
        <div className="text-neutral-500 text-sm">Loading…</div>
      ) : setlists.length === 0 ? (
        <div className="card text-sm text-neutral-400">No setlists yet.</div>
      ) : (
        <ul className="space-y-2">
          {setlists.map((sl) => (
            <li key={sl.id} className="card flex items-center justify-between gap-2">
              <Link to={`/gigg/setlists/${sl.id}`} className="flex-1 hover:opacity-80">
                <div className="font-medium">{sl.name}</div>
                <div className="text-xs text-neutral-500">
                  Created {new Date(sl.created_at).toLocaleDateString()}
                </div>
              </Link>
              <button
                className="btn-ghost text-sm shrink-0"
                onClick={() => duplicate(sl)}
              >
                Duplicate
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
